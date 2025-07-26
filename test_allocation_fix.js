// Test the allocation calculation fix
const testData = {
  "Sellowrap Industries": "5,23,200",
  "Shree Refrigerations": "9,36,000", 
  "Patel Chem Specialities": "7,00,000"
};

console.log("Testing allocation calculation fix:");

Object.entries(testData).forEach(([company, niiShares]) => {
  const niiMatch = niiShares.match(/[\d,]+/);
  if (niiMatch) {
    const totalNiiShares = parseInt(niiMatch[0].replace(/,/g, ''));
    const bNiiCount = Math.round(totalNiiShares * 2 / 3);
    const sNiiCount = Math.round(totalNiiShares * 1 / 3);
    
    console.log(`\n${company}:`);
    console.log(`  NII (HNI): ${totalNiiShares.toLocaleString('en-IN')}`);
    console.log(`  B-NII (2/3): ${bNiiCount.toLocaleString('en-IN')}`);
    console.log(`  S-NII (1/3): ${sNiiCount.toLocaleString('en-IN')}`);
    
    // Test the allocation object formatting
    const allocation = {
      niiShares: `${totalNiiShares.toLocaleString('en-IN')} shares`,
      bNiiShares: `${bNiiCount.toLocaleString('en-IN')} shares`,
      sNiiShares: `${sNiiCount.toLocaleString('en-IN')} shares`
    };
    
    console.log(`  Formatted allocation:`, allocation);
  }
});
