import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./e2e',fullyParallel:false,workers:1,reporter:'list',use:{baseURL:'http://127.0.0.1:5174',channel:'chrome',headless:true},webServer:{command:'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',url:'http://127.0.0.1:5174',reuseExistingServer:false},timeout:30000});
