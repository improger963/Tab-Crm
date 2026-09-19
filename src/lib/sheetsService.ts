import { Order, OrderStatus, OrderItem, StatusHistoryLog, OrderEvent, PaymentStatus, SaleType } from '../types';

// Helper to identify standard network fetch / CORS errors in sandboxed environments
const isNetworkError = (err: any): boolean => {
  if (!err) return false;
  const msg = String(err.message || err).toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('network error') || err instanceof TypeError;
};

// Helper to parse Google API response error and throw with detailed, actionable message
export async function checkGoogleResponse(res: Response, prefix: string): Promise<void> {
  if (res.ok) return;

  let details = '';
  try {
    const data = await res.json().catch(() => null);
    if (data && data.error && data.error.message) {
      details = `${data.error.message} (status ${res.status || 'unknown'})`;
    } else if (data && typeof data === 'object') {
      details = `Response text: ${JSON.stringify(data)} (status ${res.status || 'unknown'})`;
    } else {
      details = `HTTP status ${res.status || 'unknown'}${res.statusText ? ': ' + res.statusText : ''}`;
    }
  } catch (err: any) {
    details = `HTTP status ${res.status || 'unknown'}${res.statusText ? ': ' + res.statusText : ''} (Error decoding response: ${err?.message || err})`;
  }

  if (!details) {
    details = `HTTP status ${res.status || 'unknown'}`;
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error(`${prefix}: ${details}. This is typically caused by: (1) Google authorization token expiration, or (2) missing Google Sheets & Drive permissions. Please click "Reconnect Google Account" and make sure to CHECK BOTH verification checkboxes.`);
  }

  throw new Error(`${prefix}: ${details}`);
}

// Helper to extract first sheet title
export async function getFirstSheetTitle(spreadsheetId: string, accessToken: string): Promise<string> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please click "Reconnect Google Account".');
  }
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is missing.');
  }
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await checkGoogleResponse(res, 'Failed to fetch spreadsheet metadata');
    
    const data = await res.json();
    if (data.sheets && data.sheets.length > 0) {
      return data.sheets[0].properties.title;
    }
    return 'Sheet1';
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn('Network or CORS limitation getting sheet title (fallback triggered):', error);
      throw new Error('Network error or CORS block "Failed to fetch". If you are inside an iframe preview, please click "Open in a new tab" or click "Reconnect Google Account" to authorize.');
    } else {
      console.error('Error getting sheet title:', error);
    }
    throw error;
  }
}

// Search spreadsheets in Google Drive
export async function listSpreadsheets(accessToken: string): Promise<{ id: string; name: string }[]> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please reconnect your account.');
  }
  try {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime+desc&pageSize=50`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await checkGoogleResponse(res, 'Failed to retrieve spreadsheets list');

    const data = await res.json();
    return data.files || [];
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn('Network or CORS limitation listing spreadsheets:', error);
      throw new Error('Network error "Failed to fetch". Please check your connection or click "Reconnect Google Account". If running inside an iframe, open the app in a new tab.');
    } else {
      console.error('Error listing spreadsheets:', error);
    }
    throw error;
  }
}

// Create new spreadsheet
export async function createSpreadsheet(accessToken: string, name: string): Promise<{ id: string; url: string }> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please click "Reconnect Google Account".');
  }
  try {
    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: name,
        },
      }),
    });
    await checkGoogleResponse(res, 'Failed to create spreadsheet');

    const data = await res.json();
    const spreadsheetId = data.spreadsheetId;
    const spreadsheetUrl = data.spreadsheetUrl;

    // Initialize the sheet headers (A1:M1) - Creates clean spreadsheet with Armenian headers
    const sheetName = await getFirstSheetTitle(spreadsheetId, accessToken);
    await initializeHeaders(spreadsheetId, sheetName, accessToken);

    return { id: spreadsheetId, url: spreadsheetUrl };
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn('Network or CORS limitation creating spreadsheet:', error);
      throw new Error('Failed to fetch Google Sheets. Sandbox restriction or network glitch. Close this and try opening the page in a new tab.');
    } else {
      console.error('Error creating spreadsheet:', error);
    }
    throw error;
  }
}

const HEADERS = [
  'Առաքման օր',
  'Անուն Ազգանուն',
  'Հասցե',
  'Հեռախոս',
  'Վճարման եղանակ',
  'Վճարում / Մասնակի',
  'Մնացորդ',
  'Ապրանքներ',
  'Հավելյալ նշումներ',
  'Առաքիչ',
  'Կարգավիճակ',
  'Լայնություն',
  'Երկայնություն',
  'ID'
];

function buildItemsSummary(items: OrderItem[]): string {
  if (!items || items.length === 0) return '';
  return items.map(item => {
    const code = item.code || '';
    const artikul = item.artikul ? ` (${item.artikul})` : '';
    const qty = item.quantity && item.quantity > 1 ? ` x${item.quantity}` : '';
    if (!code && item.artikul) {
      return `${item.artikul}${qty}`;
    }
    return `${code}${artikul}${qty}`;
  }).filter(Boolean).join(', ');
}

function parseItemsString(itemsStr: string): OrderItem[] {
  if (!itemsStr || !itemsStr.trim()) return [];
  const parts = itemsStr.split(',').map(s => s.trim()).filter(Boolean);
  return parts.map((part, idx) => {
    let quantity = 1;
    let cleanPart = part;
    const qtyMatch = part.match(/\s+x(\d+)$/i);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1], 10) || 1;
      cleanPart = part.replace(/\s+x(\d+)$/i, '').trim();
    }

    const match = cleanPart.match(/^([^\(]+)(?:\(([^\)]+)\))?/);
    let code = cleanPart;
    let artikul = '';
    if (match) {
      code = (match[1] || '').trim();
      artikul = (match[2] || '').trim();
    }

    return {
      id: `item-sheet-${idx}-${Date.now()}`,
      code: code || '',
      artikul: artikul || '',
      quantity: quantity,
      price: 0,
      discount: 0
    };
  });
}

function buildOrderRow(order: Order): string[] {
  const itemsSummary = buildItemsSummary(order.items || []);

  const paymentText = order.paymentStatus === PaymentStatus.PARTIAL
    ? `Մասնակի: ${order.prepaymentAmount || 0} ֏`
    : (order.paymentStatus || '');

  return [
    order.purchaseDate || '',
    order.customerName || '',
    order.address || '',
    order.phoneNumber || '',
    order.saleType || SaleType.ON_SITE,
    paymentText,
    (order.remainingBalance || 0).toString(),
    itemsSummary,
    order.notes || '',
    '', // driverName
    order.status || OrderStatus.PENDING,
    (order.latitude || 40.1792).toString(),
    (order.longitude || 44.5152).toString(),
    order.id || ''
  ];
}

async function initializeHeaders(spreadsheetId: string, sheetName: string, accessToken: string): Promise<void> {
  const range = `${sheetName}!A1:N1`;
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [HEADERS],
    }),
  });
  await checkGoogleResponse(res, 'Failed to initialize sheet headers');
}

// Write mock orders if spreadsheet is newly created
async function appendMockDataIfEmpty(spreadsheetId: string, sheetName: string, accessToken: string): Promise<void> {
  const range = `${sheetName}!A2:M`;
  const initialMockOrders: Order[] = [
    {
      id: 'ORD-R2',
      purchaseDate: '27.05.2026',
      customerName: 'shavars',
      address: 'sharnvi 27a yuri kirakosyan hamar',
      phoneNumber: '93472329',
      saleType: SaleType.ON_SITE,
      deliveryDate: '',
      items: [
        { id: '1', code: '2145', artikul: 'V343578', quantity: 1, price: 15000, discount: 0 },
        { id: '2', code: '4577', artikul: 'GZ789874-S', quantity: 1, price: 16000, discount: 0 }
      ],
      totalAmount: 31000,
      status: OrderStatus.IN_TRANSIT,
      paymentStatus: PaymentStatus.PAID,
      notes: 'Kachasufi kancry 5500',
      statusHistory: [{ status: OrderStatus.IN_TRANSIT, timestamp: new Date().toISOString() }],
      latitude: 40.1815,
      longitude: 44.5240,
      events: []
    },
    {
      id: 'ORD-R3',
      purchaseDate: '25.05.2026',
      customerName: '35-in araqum',
      address: 'noravan taxamas/ 1-in poxoc/ 5.. ph',
      phoneNumber: '77164606',
      saleType: SaleType.ON_SITE,
      deliveryDate: '',
      items: [{ id: '3', code: '4204', artikul: 'ART-4204', quantity: 1, price: 67452, discount: 0 }],
      totalAmount: 67452,
      status: OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      notes: '11,041-i / 1118, 1119/ p755 f1',
      statusHistory: [{ status: OrderStatus.PENDING, timestamp: new Date().toISOString() }],
      latitude: 40.1830,
      longitude: 44.5140,
      events: []
    }
  ];

  const initialRows = initialMockOrders.map(buildOrderRow);

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: initialRows,
    }),
  });
  await checkGoogleResponse(res, 'Failed to write initial mock data');
}

// Read all orders from the spreadsheet
export async function readOrdersFromSheet(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string
): Promise<{ orders: Order[]; headers: string[]; rawRows: string[][]; sheetName: string }> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please click "Reconnect Google Account".');
  }
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is missing.');
  }
  try {
    const range = `${sheetName}!A1:N1000`;
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await checkGoogleResponse(res, 'Failed to read values from sheet');

    const data = await res.json();
    const rows: string[][] = data.values || [];

    if (rows.length === 0) {
      // Empty sheet, initialize headers
      await initializeHeaders(spreadsheetId, sheetName, accessToken);
      return { orders: [], headers: HEADERS, rawRows: [HEADERS], sheetName };
    }

    const headers = rows[0];
    const rawRows = rows;
    const orders: Order[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0 || (!row[0] && !row[1] && !row[2])) continue; // Skip truly empty rows

      const orderId = (row[13] && row[13].trim()) ? row[13].trim() : `ORD-R${i + 1}`;
      const purchaseDate = row[0] || '';
      const customerName = row[1] || '';
      const address = row[2] || '';
      const phoneNumber = row[3] || '';
      const saleTypeStr = row[4] || '';
      const saleType = Object.values(SaleType).includes(saleTypeStr as SaleType) ? (saleTypeStr as SaleType) : SaleType.ON_SITE;
      
      const itemsSummaryCol = row[7] || '';
      const notesCol = row[8] || '';
      const driverCol = row[9] || '';
      const fullNotes = driverCol ? `Առաքիչ: ${driverCol}\n${notesCol}` : notesCol;

      let status = OrderStatus.PENDING;
      const rawStatus = (row[10] || '').trim();
      if (Object.values(OrderStatus).includes(rawStatus as OrderStatus)) {
        status = rawStatus as OrderStatus;
      } else if (rawStatus.includes('Սպասում') || rawStatus.includes('Կասա')) {
        status = OrderStatus.PENDING;
      } else if (rawStatus.includes('Առաքման') || rawStatus.includes('Ընթացք')) {
        status = OrderStatus.IN_TRANSIT;
      } else if (rawStatus.includes('Ավարտված') || rawStatus.includes('Հանձնված')) {
        status = OrderStatus.DELIVERED;
      } else if (rawStatus.includes('Վաճառված') || rawStatus.includes('POS')) {
        status = OrderStatus.SOLD;
      } else if (rawStatus.includes('Չեղարկված')) {
        status = OrderStatus.CANCELLED;
      }

      const rawPaymentInfo = (row[5] || '').trim();
      let paymentStatus = PaymentStatus.UNPAID;
      if (rawPaymentInfo.includes('Լրիվ') || rawPaymentInfo.includes('Վճարված') || rawPaymentInfo === PaymentStatus.PAID) {
        paymentStatus = PaymentStatus.PAID;
      } else if (rawPaymentInfo.includes('Մասնակի') || rawPaymentInfo.includes('Կանխավճար') || rawPaymentInfo === PaymentStatus.PARTIAL) {
        paymentStatus = PaymentStatus.PARTIAL;
      }

      const cleanBalanceStr = (row[6] || '').toString().replace(/[^\d.-]/g, '');
      const remainingBalance = parseFloat(cleanBalanceStr) || 0;

      const rawLat = (row[11] || '').toString().replace(/[^\d.-]/g, '');
      const rawLng = (row[12] || '').toString().replace(/[^\d.-]/g, '');
      const latitude = isNaN(parseFloat(rawLat)) ? 40.1792 : parseFloat(rawLat);
      const longitude = isNaN(parseFloat(rawLng)) ? 44.5152 : parseFloat(rawLng);

      const items: OrderItem[] = parseItemsString(itemsSummaryCol);
      const totalAmount = items.reduce((sum, item) => sum + ((item.quantity || 1) * (item.price || 0)), 0);

      orders.push({
        id: orderId,
        purchaseDate,
        customerName,
        address,
        phoneNumber,
        saleType,
        deliveryDate: '',
        items,
        totalAmount,
        status,
        paymentStatus,
        remainingBalance,
        notes: fullNotes,
        statusHistory: [{ status, timestamp: new Date().toISOString() }] as StatusHistoryLog[],
        latitude,
        longitude,
        events: [] as OrderEvent[]
      });
    }

    return { orders, headers, rawRows, sheetName };
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn('Network or CORS limitation reading orders from sheet:', error);
      throw new Error('Failed to fetch Google Sheets. Sandbox restriction or network glitch. Try opening in a new tab.');
    } else {
      console.error('Error reading orders from sheet:', error);
    }
    throw error;
  }
}

// Add a new order
export async function addOrderToSheet(
  spreadsheetId: string,
  sheetName: string,
  order: Order,
  accessToken: string
): Promise<void> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please click "Reconnect Google Account".');
  }
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is missing.');
  }
  try {
    const range = `${sheetName}!A:N`;
    const values = [buildOrderRow(order)];

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });
    await checkGoogleResponse(res, 'Failed to append order');
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn('Network or CORS limitation appending order to sheet:', error);
      throw new Error('Failed to fetch Google Sheets. Open the app in a new tab if network blocked.');
    } else {
      console.error('Error appending order to sheet:', order, error);
    }
    throw error;
  }
}

// Update order status/assignee/location (overwrites exact row)
export async function updateOrderInSheet(
  spreadsheetId: string,
  sheetName: string,
  order: Order,
  rowIndex: number,
  accessToken: string
): Promise<void> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please click "Reconnect Google Account".');
  }
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is missing.');
  }
  try {
    const range = `${sheetName}!A${rowIndex}:N${rowIndex}`;
    const values = [buildOrderRow(order)];

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });
    await checkGoogleResponse(res, `Failed to update order at row ${rowIndex}`);
  } catch (error: any) {
    if (isNetworkError(error)) {
      console.warn(`Network or CORS limitation updating order at row ${rowIndex}:`, error);
      throw new Error('Failed to fetch Google Sheets. Sandbox restriction. Try opening in a new tab.');
    } else {
      console.error(`Error updating order at row ${rowIndex}:`, error);
    }
    throw error;
  }
}

// Overwrite all orders in the sheet
export async function overwriteAllOrdersInSheet(
  spreadsheetId: string,
  sheetName: string,
  orders: Order[],
  accessToken: string
): Promise<void> {
  if (!accessToken) {
    throw new Error('Google access token is missing. Please click "Reconnect Google Account".');
  }
  if (!spreadsheetId) {
    throw new Error('Spreadsheet ID is missing.');
  }
  try {
    // 1. Re-initialize headers at A1:N1
    await initializeHeaders(spreadsheetId, sheetName, accessToken);

    // 2. Prepare the rows
    const values = orders.map(buildOrderRow);

    // 3. Clear existing values under headers (A2:N1000)
    const clearRange = `${sheetName}!A2:N1000`;
    const clearRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(clearRange)}:clear`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await checkGoogleResponse(clearRes, 'Failed to clear existing sheet rows');

    if (values.length === 0) return;

    // 4. Put the new values at A2:N...
    const writeRange = `${sheetName}!A2:N${1 + values.length}`;
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(writeRange)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    });
    await checkGoogleResponse(res, 'Failed to overwrite all orders');
  } catch (error: any) {
    if (isNetworkError(error)) {
      throw new Error('Failed to fetch Google Sheets. Sandbox restriction or network glitch. Try opening in a new tab.');
    }
    throw error;
  }
}

