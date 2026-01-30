// Clear Authentication Script for Testing
// Run this in the browser console to clear all authentication data

(function clearAuth() {
    // Clear all localStorage
    localStorage.clear();

    // Clear all sessionStorage 
    sessionStorage.clear();

    // Clear any other storage
    if (window.indexedDB) {
        indexedDB.databases().then(dbs => {
            dbs.forEach(db => {
                indexedDB.deleteDatabase(db.name);
            });
        });
    }

    console.log('✅ All authentication data cleared');
    console.log('🔄 Please refresh the page to test fresh authentication');

    // Optionally refresh the page
    // window.location.reload();
})();