// Quick test of the simplified monitoring system
console.log('🧪 Testing Simple Monitoring System...\n');

// Test 1: Check if files exist
const fs = require('fs');
const path = require('path');

const files = [
  'cardsite/lib/monitoring.ts',
  'cardsite/components/monitoring-dashboard.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} exists`);
  } else {
    console.log(`❌ ${file} missing`);
  }
});

// Test 2: Check file contents
console.log('\n📄 Checking monitoring.ts content...');
const monitoringContent = fs.readFileSync('cardsite/lib/monitoring.ts', 'utf8');

const requiredExports = ['monitor', 'trackError', 'trackPerformance', 'trackSecurity'];
requiredExports.forEach(exportName => {
  if (monitoringContent.includes(`export function ${exportName}`) || 
      monitoringContent.includes(`export const ${exportName}`)) {
    console.log(`✅ ${exportName} exported`);
  } else {
    console.log(`❌ ${exportName} not found`);
  }
});

// Test 3: Check dashboard
console.log('\n📄 Checking dashboard...');
const dashboardContent = fs.readFileSync('cardsite/components/monitoring-dashboard.tsx', 'utf8');
if (dashboardContent.includes('MonitoringDashboard')) {
  console.log('✅ MonitoringDashboard component found');
} else {
  console.log('❌ MonitoringDashboard component not found');
}

console.log('\n🎉 Quick test complete!');
console.log('\nNext steps:');
console.log('1. Fix any auth import issues');
console.log('2. Run npm run build to check for errors');
console.log('3. Start dev server and test monitoring button'); 