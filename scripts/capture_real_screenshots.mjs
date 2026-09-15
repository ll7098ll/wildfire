import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('docs/images');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🚀 Starting Puppeteer for real application screenshots...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });

  // Wait for canvas to be mounted
  await page.waitForSelector('#wildfire-3d-canvas', { timeout: 30000 });
  console.log('✅ Three.js canvas detected.');

  // Give Three.js time to build the 100km² mountain terrain and instanced trees
  await sleep(4000);

  // Trigger ignition and advance fire so it is visibly burning
  console.log('🔥 Triggering mountain wildfire ignition...');
  const igniteBtn = await page.$('#btn-ignite-sample');
  if (igniteBtn) {
    await igniteBtn.click();
  } else {
    await page.evaluate(() => {
      if (window.__engine) {
        window.__engine.ignite(64, 64, 5);
      }
    });
  }

  // Let fire spread for a few simulation ticks
  await sleep(3500);

  // 1. HERO DASHBOARD (Day Mode, Orbit Angle, Active Fire)
  console.log('📸 1/5: Capturing Hero Dashboard (Day Mode)...');
  const heroPath = path.join(OUTPUT_DIR, 'hero_dashboard.jpg');
  await page.screenshot({ path: heroPath, type: 'jpeg', quality: 92 });
  console.log(`Saved ${heroPath} (${fs.statSync(heroPath).size} bytes)`);

  // 2. NIGHT MODE (Midnight sky, glowing dynamic fire front)
  console.log('📸 2/5: Switching to Night Mode and capturing...');
  const nightBtn = await page.$('#light-night');
  if (nightBtn) {
    await nightBtn.click();
  } else {
    await page.evaluate(() => {
      if (window.__sceneManager) window.__sceneManager.setLighting('night');
    });
  }
  await sleep(2000);
  const nightPath = path.join(OUTPUT_DIR, 'night_fire_front.jpg');
  await page.screenshot({ path: nightPath, type: 'jpeg', quality: 92 });
  console.log(`Saved ${nightPath} (${fs.statSync(nightPath).size} bytes)`);

  // 3. AERIAL TOP-DOWN SPREAD MAP (Tactical Bird's-Eye View)
  console.log('📸 3/5: Switching to Top-Down Aerial View...');
  const dayBtn = await page.$('#light-day');
  if (dayBtn) await dayBtn.click();

  const topDownBtn = await page.$('#cam-top-down');
  if (topDownBtn) {
    await topDownBtn.click();
  } else {
    await page.evaluate(() => {
      if (window.__sceneManager) {
        window.__sceneManager.setCameraPreset('top_down', undefined, true);
      }
    });
  }
  await sleep(2500);
  const aerialPath = path.join(OUTPUT_DIR, 'aerial_spread_map.jpg');
  await page.screenshot({ path: aerialPath, type: 'jpeg', quality: 92 });
  console.log(`Saved ${aerialPath} (${fs.statSync(aerialPath).size} bytes)`);

  // 4. CONTROL HUB UI (Focused on Weather Controls & Risk Gauge)
  console.log('📸 4/5: Capturing Unified Control Hub UI...');
  const orbitBtn = await page.$('#cam-orbit');
  if (orbitBtn) await orbitBtn.click();
  await sleep(1500);

  const weatherTab = await page.$('#tab-weather');
  if (weatherTab) await weatherTab.click();
  await sleep(1000);

  const controlHubElem = await page.$('#unified-control-hub');
  const controlHubPath = path.join(OUTPUT_DIR, 'control_hub_ui.jpg');
  if (controlHubElem) {
    await controlHubElem.screenshot({ path: controlHubPath, type: 'jpeg', quality: 95 });
  } else {
    await page.screenshot({ path: controlHubPath, type: 'jpeg', quality: 92 });
  }
  console.log(`Saved ${controlHubPath} (${fs.statSync(controlHubPath).size} bytes)`);

  // 5. SCENARIOS & DATASET EXPLORER UI
  console.log('📸 5/5: Switching to Scenarios & Dataset Tab and capturing...');
  const scenariosTab = await page.$('#tab-scenarios');
  if (scenariosTab) await scenariosTab.click();
  await sleep(1200);

  const scenarioDatasetPath = path.join(OUTPUT_DIR, 'scenario_dataset_ui.jpg');
  const controlHubElem2 = await page.$('#unified-control-hub');
  if (controlHubElem2) {
    await controlHubElem2.screenshot({ path: scenarioDatasetPath, type: 'jpeg', quality: 95 });
  } else {
    await page.screenshot({ path: scenarioDatasetPath, type: 'jpeg', quality: 92 });
  }
  console.log(`Saved ${scenarioDatasetPath} (${fs.statSync(scenarioDatasetPath).size} bytes)`);

  await browser.close();
  console.log('🎉 ALL 5 REAL APPLICATION SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

main().catch(err => {
  console.error('❌ Capture Error:', err);
  process.exit(1);
});
