const dbName = "UserDB";
const storeName = "Users"; // Object store for client data
const actionsStoreName = "actions";
const creditAccountStoreName = "creditaccount";
const debitAccountStoreName = "debitaccount";
const employeeStoreName = "employee"; // Object store for employee data
const ressourcesStoreName = "ressources"; // Object store for ressources data

let db;

// Create a promise that resolves when the database is ready
const dbReady = new Promise((resolve, reject) => {
    // Increment the version number to 32 (or the next available version)
    const request = indexedDB.open(dbName, 32);

    request.onupgradeneeded = function (event) {
        db = event.target.result;
        console.log("Upgrading DB, existing stores:", db.objectStoreNames);

        // Create the Users object store if it doesn't exist
        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "username" }); // Use "username" as the keyPath
        }

        // Create the Actions object store if it doesn't exist
        if (!db.objectStoreNames.contains(actionsStoreName)) {
            const actionsStore = db.createObjectStore(actionsStoreName, { autoIncrement: true });
            actionsStore.createIndex("username", "username", { unique: false });
        }

        // Create the Debit Account object store if it doesn't exist
        if (!db.objectStoreNames.contains(debitAccountStoreName)) {
            db.createObjectStore(debitAccountStoreName, { keyPath: "accountname" });
        }

        // Create the Credit Account object store if it doesn't exist
        if (!db.objectStoreNames.contains(creditAccountStoreName)) {
            db.createObjectStore(creditAccountStoreName, { keyPath: "accountname" });
        }

        // Create the Employee object store with auto-incrementing ID
        if (!db.objectStoreNames.contains(employeeStoreName)) {
            db.createObjectStore(employeeStoreName, { keyPath: "id", autoIncrement: true });
        }

        // Create the Ressources object store if it doesn't exist
        if (!db.objectStoreNames.contains(ressourcesStoreName)) {
            db.createObjectStore(ressourcesStoreName, { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = function (event) {
        db = event.target.result;
        console.log("Database opened successfully");
        resolve(db); // Resolve the promise with the database object
    };

    request.onerror = function (event) {
        console.error("Error opening database:", event.target.error);
        reject(event.target.error); // Reject the promise if there's an error
    };
});

let isDataInserted = false; // Flag to prevent multiple calls

async function insertDataFromJSON() {
    if (isDataInserted) {
        console.log("Data insertion already in progress.");
        return; // Prevent re-execution
    }

    try {
        isDataInserted = true; // Set flag to true to prevent re-execution

        console.log("Starting data insertion...");
        await insertClientData();
        await insertActionData();
        await insertDebitAccountData(); // Insert debit accounts
        await insertCreditAccountData(); // Insert credit accounts
        await insertEmployeeData(); // Insert employee data
        await insertRessourcesData(); // Insert ressources data

        console.log("Data insertion completed successfully!");
        logAllData(); // Log all data after all insertions are complete
    } catch (error) {
        console.error("Error in inserting data:", error);
    } finally {
        isDataInserted = false; // Reset the flag once the process is complete
    }
}

async function insertClientData() {
    const response = await fetch('client.json');
    const data = await response.json();
    return insertDataIntoStore(storeName, data); // Improved batch insert
}

async function insertActionData() {
    const response = await fetch('action.json');
    const data = await response.json();
    return insertDataIntoStore(actionsStoreName, data); // Improved batch insert
}

async function insertDebitAccountData() {
    const response = await fetch('debitAccount.json');
    const data = await response.json();
    return insertDataIntoStore(debitAccountStoreName, data); // Improved batch insert
}

async function insertCreditAccountData() {
    const response = await fetch('creditAccount.json');
    const data = await response.json();
    return insertDataIntoStore(creditAccountStoreName, data); // Improved batch insert
}

async function insertEmployeeData() {
    const response = await fetch('employee.json');
    const data = await response.json();
    return insertDataIntoStore(employeeStoreName, data); // Insert employee data
}

async function insertRessourcesData() {
    const response = await fetch('ressources.json');
    const data = await response.json();
    return insertDataIntoStore(ressourcesStoreName, data); // Insert ressources data
}

function insertDataIntoStore(storeName, data) {
    const batchSize = 100; // Number of records to insert at once
    let batchStart = 0; // Starting index for batch insertion

    return new Promise((resolve, reject) => {
        function insertBatch() {
            const batchEnd = Math.min(batchStart + batchSize, data.length);
            const batch = data.slice(batchStart, batchEnd);

            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);

            batch.forEach((item) => store.put(item));

            transaction.oncomplete = function () {
                console.log("Batch inserted: ", batchStart, "to", batchEnd);
                batchStart = batchEnd;
                if (batchStart < data.length) {
                    insertBatch(); // Continue inserting the next batch
                } else {
                    console.log(storeName, "data inserted successfully!");
                    resolve(); // Resolve the promise when done
                }
            };

            transaction.onerror = function (event) {
                console.error("Error inserting", storeName, "data:", event.target.error);
                reject(event.target.error); // Reject if an error occurs
            };
        }

        insertBatch(); // Start the first batch insert
    });
}

function logAllData() {
    const transaction = db.transaction(
        [storeName, actionsStoreName, debitAccountStoreName, creditAccountStoreName, employeeStoreName, ressourcesStoreName],
        "readonly"
    );
    const usersStore = transaction.objectStore(storeName);
    const actionsStore = transaction.objectStore(actionsStoreName);
    const debitStore = transaction.objectStore(debitAccountStoreName);
    const creditStore = transaction.objectStore(creditAccountStoreName);
    const employeeStore = transaction.objectStore(employeeStoreName);
    const ressourcesStore = transaction.objectStore(ressourcesStoreName);

    usersStore.getAll().onsuccess = function (event) {
        console.log("Users Data:", event.target.result);
    };
    actionsStore.getAll().onsuccess = function (event) {
        console.log("Actions Data:", event.target.result);
    };
    debitStore.getAll().onsuccess = function (event) {
        console.log("Debit Accounts Data:", event.target.result);
    };
    creditStore.getAll().onsuccess = function (event) {
        console.log("Credit Accounts Data:", event.target.result);
    };
    employeeStore.getAll().onsuccess = function (event) {
        console.log("Employee Data:", event.target.result);
    };
    ressourcesStore.getAll().onsuccess = function (event) {
        console.log("Ressources Data:", event.target.result);
    };
}

// Add this function to your data.js file
function fetchDataFromIndexedDB(db, storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            reject(request.error);
        };
    });
}

// Expose the fetchDataFromIndexedDB function to other scripts
window.fetchDataFromIndexedDB = fetchDataFromIndexedDB;

// Expose the db and dbReady to other scripts
window.db = db;
window.dbReady = dbReady;