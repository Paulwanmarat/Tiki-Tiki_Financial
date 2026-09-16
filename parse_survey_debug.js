const fs = require('fs');

const csv = fs.readFileSync('Survey.csv', 'utf8');
const lines = csv.trim().split('\n');

function parseRow(line) {
  const row = [];
  let c = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i+1] === '"') { c += '"'; i++; }
    else if (ch === '"') { q = !q; }
    else if (ch === ',' && !q) { row.push(c.trim()); c = ''; }
    else { c += ch; }
  }
  row.push(c.trim());
  return row;
}

const ages = {};
const manageOwnMoney = {};
const spendMoneyOn = {};
const mostUsefulFeature = {};
const overspentFrequency = {};
const wouldUseApp = {};
let validCount = 0;

for (let i = 1; i < lines.length; i++) {
  const row = parseRow(lines[i]);
  if (row.length < 2) continue;
  validCount++;
  
  const age = row[1];
  if (age) ages[age] = (ages[age] || 0) + 1;
  
  const manage = row[2];
  if (manage) manageOwnMoney[manage] = (manageOwnMoney[manage] || 0) + 1;
  
  const spend = row[3];
  if (spend) {
    // Normalize spending categories
    const normalized = spend.replace(/^🍔\s*/, '🍔 ')
      .replace(/^📱\s*/, '📱 ')
      .replace(/^🛍️\s*/, '🛍️ ')
      .replace(/^🎮\s*/, '🎮 ')
      .replace(/^🚗\s*/, '🚗 ')
      .replace(/^📚\s*/, '📚 ');
    spendMoneyOn[normalized] = (spendMoneyOn[normalized] || 0) + 1;
  }
  
  // Column 4 = overspent
  const overspent = row[4];
  if (overspent) overspentFrequency[overspent] = (overspentFrequency[overspent] || 0) + 1;
  
  // Column 10 = would use app
  const useApp = row[10];
  if (useApp) wouldUseApp[useApp] = (wouldUseApp[useApp] || 0) + 1;
  
  // Feature is column 11
  const feature = row[11];
  if (feature) mostUsefulFeature[feature] = (mostUsefulFeature[feature] || 0) + 1;
}

const surveyData = {
  totalResponses: validCount,
  distributions: {
    ages,
    manageOwnMoney,
    spendMoneyOn,
    mostUsefulFeature,
    overspentFrequency,
    wouldUseApp
  }
};

fs.writeFileSync('src/constants/surveyData.json', JSON.stringify(surveyData, null, 2));
console.log('Survey data written with', validCount, 'responses');
console.log(JSON.stringify(surveyData, null, 2));
