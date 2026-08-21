
const requiredVars = [
  'CASHFREE_APP_ID',
  'CASHFREE_SECRET_KEY',
  'CASHFREE_ENV',
  'CASHFREE_PLAN_STARTER',
  'CASHFREE_PLAN_PRO'
];

console.log('--- Checking Cashfree Environment Configuration ---');
let allPresent = true;
requiredVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`[OK] ${varName} is configured.`);
  } else {
    console.log(`[MISSING] ${varName} is NOT configured.`);
    allPresent = false;
  }
});

if (allPresent) {
  console.log('--- Cashfree Configuration appears READY ---');
} else {
  console.log('--- Cashfree Configuration is INCOMPLETE ---');
}
