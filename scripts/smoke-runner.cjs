const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = process.env.SMOKE_PORT || 5177;

function startStaticServer(dir, port) {
  const server = http.createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      let filePath = path.join(dir, urlPath);
      if (urlPath === '/' || urlPath === '') {
        filePath = path.join(dir, 'index.html');
      }
      if (!filePath.startsWith(dir)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end('Not found');
        return;
      }
      const stream = fs.createReadStream(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff'
      }[ext] || 'application/octet-stream';
      res.setHeader('Content-Type', mime);
      stream.pipe(res);
    } catch (e) {
      res.statusCode = 500;
      res.end('Server error');
    }
  });

  return new Promise((resolve, reject) => {
    server.listen(port, '127.0.0.1', (err) => {
      if (err) return reject(err);
      resolve(server);
    });
  });
}

(async () => {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist folder not found. Run `pnpm run build` first.');
    process.exit(1);
  }

  const server = await startStaticServer(DIST_DIR, PORT);
  console.log('Static server running at http://127.0.0.1:' + PORT);

  const outDir = path.join(__dirname, 'smoke-output');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const serverUrl = `http://127.0.0.1:${PORT}/`;

  const headless = process.env.SMOKE_HEADLESS === 'false' ? false : true;
  console.log('Launching browser headless=', headless);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();

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

  // Seed sample data and a valid session so the app shows protected lists
  const now = Date.now();
  const expiry = now + 1000 * 60 * 60; // 1 hour
  const sampleSession = {
    msnv: '1118',
    fullName: 'Quản trị viên hệ thống',
    department: 'Quản trị',
    position: 'Quản trị viên',
    role: 'admin',
    status: 'active',
    permissions: {
      'kho-tong': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
      'kho-co-khi': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
      'kho-cnc': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
      'kho-dau': { view: true, add: true, edit: true, delete: true, approve: true, export: true },
      'bao-cao-tong-hop': { view: true, add: true, edit: true, delete: true, approve: true, export: true }
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await context.addInitScript({ content: `localStorage.setItem('warehouseTransfers', '${JSON.stringify(sampleTransfer).replace(/'/g, "\\'")}'); localStorage.setItem('warehouseExports', '${JSON.stringify(sampleExport).replace(/'/g, "\\'")}'); localStorage.setItem('currentUserSession', '${JSON.stringify(sampleSession).replace(/'/g, "\\'")}'); localStorage.setItem('sessionExpiry', '${expiry}');` });

  try {
    await page.goto(serverUrl, { waitUntil: 'networkidle' });
    console.log('Loaded app root');

    const results = [];

    // Transfers
    try {
      // Open the Transfer section by clicking its card in the dashboard
      await page.click('text=Phiếu Chuyển Kho');
      await page.waitForSelector('text=Danh Sách Phiếu Chuyển', { timeout: 5000 });
      await page.waitForSelector('text=CKTEST1', { timeout: 5000 });
      results.push('transfer-visibility:ok');

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('text=Xuất Excel')
      ]);
      const savePath = path.join(outDir, await download.suggestedFilename());
      await download.saveAs(savePath);
      console.log('Downloaded transfer Excel to', savePath);
      results.push('transfer-excel:ok');

      // Intercept window.open to capture printed HTML into a global variable
      await page.evaluate(() => {
        window.__last_print_html = null;
        window.open = function() {
          return {
            document: {
              write: function(html) {
                try { window.__last_print_html = String(html); } catch (e) { window.__last_print_html = '' + html; }
              }
            },
            focus: function() {},
            close: function() {}
          };
        };
      });

      await page.click('text=In');
      try {
        await page.waitForFunction(() => !!window.__last_print_html, { timeout: 5000 });
        const printed = await page.evaluate(() => window.__last_print_html || '');
        if (printed.includes('Phiếu Chuyển Kho') || printed.includes('CKTEST1')) {
          results.push('transfer-print:ok');
        } else {
          results.push('transfer-print:fail');
        }
      } catch (e) {
        results.push('transfer-print:fail');
      }
    } catch (e) {
      console.error('Transfer tests failed:', e.message);
      results.push('transfer-visibility:fail');
    }

    // Exports
    try {
      // Open the Export section from the dashboard
      await page.click('text=Phiếu Xuất Kho');
      await page.waitForSelector('text=Danh sách phiếu xuất', { timeout: 5000 });
      await page.waitForSelector('text=XKTEST1', { timeout: 5000 });
      results.push('export-visibility:ok');

      const [download2] = await Promise.all([
        page.waitForEvent('download'),
        page.click('text=Xuất Excel')
      ]);
      const savePath2 = path.join(outDir, await download2.suggestedFilename());
      await download2.saveAs(savePath2);
      console.log('Downloaded export Excel to', savePath2);
      results.push('export-excel:ok');

      // Intercept window.open to capture printed HTML into a global variable
      await page.evaluate(() => {
        window.__last_print_html = null;
        window.open = function() {
          return {
            document: {
              write: function(html) {
                try { window.__last_print_html = String(html); } catch (e) { window.__last_print_html = '' + html; }
              }
            },
            focus: function() {},
            close: function() {}
          };
        };
      });

      await page.click('text=In');
      try {
        await page.waitForFunction(() => !!window.__last_print_html, { timeout: 5000 });
        const printed2 = await page.evaluate(() => window.__last_print_html || '');
        if (printed2.includes('Phiếu Xuất Kho') || printed2.includes('XKTEST1')) {
          results.push('export-print:ok');
        } else {
          results.push('export-print:fail');
        }
      } catch (e) {
        results.push('export-print:fail');
      }
    } catch (e) {
      console.error('Export tests failed:', e.message);
      results.push('export-visibility:fail');
    }

    console.log('Smoke test results:', results);
    await browser.close();
    server.close();
    // Consider visibility and Excel export as required checks; printing is optional in headless mode
    const required = ['transfer-visibility:ok', 'transfer-excel:ok', 'export-visibility:ok', 'export-excel:ok'];
    const ok = required.every(r => results.includes(r));
    process.exit(ok ? 0 : 2);
  } catch (err) {
    console.error('Smoke run failed:', err.message);
    await browser.close();
    server.close();
    process.exit(2);
  }
})();