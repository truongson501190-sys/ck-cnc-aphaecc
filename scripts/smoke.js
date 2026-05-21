const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = path.join(__dirname, 'smoke-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const serverUrl = process.env.SMOKE_URL || 'http://localhost:5175/';
  console.log('Smoke test server URL:', serverUrl);

  // Read reset-localStorage.js to seed users
  const resetFile = path.join(__dirname, '..', 'reset-localStorage.js');
  let resetScript = '';
  if (fs.existsSync(resetFile)) {
    resetScript = fs.readFileSync(resetFile, 'utf8');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

  if (resetScript) {
    // Inject script to run before any page loads
    await context.addInitScript({ content: resetScript });
    // Also ensure a sample transfer/export exists
  }

  // Prepare sample data
  const sampleTransfer = [{
    soPhieu: 'CKTEST1',
    ngayChuyen: new Date().toISOString(),
    nguoiChuyen: 'Nguyễn Văn Admin',
    khoXuat: 'Kho A',
    khoNhap: 'Kho B',
    items: [{ tenChungLoai: 'Test Item', donVi: 'pcs', soLuong: 2, donGia: 1000, thanhTien: 2000 }],
    tongTien: 2000,
    createdAt: new Date().toISOString()
  }];

  const sampleExport = [{
    soPhieu: 'XKTEST1',
    ngayXuat: new Date().toISOString(),
    nguoiXuat: 'Nguyễn Văn Admin',
    khoXuat: 'Kho A',
    nguoiNhan: 'Nguyễn Văn B',
    items: [{ tenChungLoai: 'Export Item', donVi: 'pcs', soLuong: 3, donGia: 500, thanhTien: 1500 }],
    tongTien: 1500,
    createdAt: new Date().toISOString()
  }];

  // Inject localStorage items
  await context.addInitScript({ content: `localStorage.setItem('warehouseTransfers', '${JSON.stringify(sampleTransfer).replace(/'/g, "\\'")}'); localStorage.setItem('warehouseExports', '${JSON.stringify(sampleExport).replace(/'/g, "\\'")}');` });

  // Navigate to app
  await page.goto(serverUrl, { waitUntil: 'networkidle' });
  console.log('Loaded app root');

  const results = [];

  // Test transfers list presence
  try {
    // Wait for transfers list card
    await page.waitForSelector('text=Danh Sách Phiếu Chuyển', { timeout: 5000 });
    console.log('Found transfers list card');
    // Ensure sample invoice id is visible
    await page.waitForSelector(`text=CKTEST1`, { timeout: 5000 });
    console.log('Transfer CKTEST1 visible in UI');
    results.push('transfer-visibility:ok');

    // Click Xuất Excel for the sample transfer
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Xuất Excel')
    ]);
    const savePath = path.join(outDir, await download.suggestedFilename());
    await download.saveAs(savePath);
    console.log('Downloaded transfer Excel to', savePath);
    results.push('transfer-excel:ok');

    // Click In and check popup
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=In')
    ]);
    await popup.waitForLoadState('domcontentloaded');
    const popupContent = await popup.content();
    if (popupContent.includes('Phiếu Chuyển Kho') || popupContent.includes('CKTEST1')) {
      console.log('Print popup content looks correct');
      results.push('transfer-print:ok');
    } else {
      console.log('Unexpected print popup content');
      results.push('transfer-print:fail');
    }
  } catch (e) {
    console.error('Transfer tests failed:', e.message);
    results.push('transfer-visibility:fail');
  }

  // Test exports list
  try {
    await page.waitForSelector('text=Danh Sách Phiếu Xuất', { timeout: 5000 });
    console.log('Found exports list card');
    await page.waitForSelector('text=XKTEST1', { timeout: 5000 });
    console.log('Export XKTEST1 visible in UI');
    results.push('export-visibility:ok');

    const [download2] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=Xuất Excel', { timeout: 5000 })
    ]);
    const savePath2 = path.join(outDir, await download2.suggestedFilename());
    await download2.saveAs(savePath2);
    console.log('Downloaded export Excel to', savePath2);
    results.push('export-excel:ok');

    const [popup2] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('text=In')
    ]);
    await popup2.waitForLoadState('domcontentloaded');
    const popupContent2 = await popup2.content();
    if (popupContent2.includes('Phiếu Xuất Kho') || popupContent2.includes('XKTEST1')) {
      console.log('Export print popup content looks correct');
      results.push('export-print:ok');
    } else {
      console.log('Unexpected export print popup content');
      results.push('export-print:fail');
    }
  } catch (e) {
    console.error('Export tests failed:', e.message);
    results.push('export-visibility:fail');
  }

  console.log('Smoke test results:', results);

  await browser.close();
  process.exit(results.every(r => r.endsWith(':ok')) ? 0 : 2);
})();
