// Google Sheets Data Fetcher via Cloudflare Worker
// Fetches data from Cloudflare Worker to hide API keys

const WORKER_URL = 'https://phivolcs-worker.22afed28-f0b2-46d0-8804-c90e25c90bd4.workers.dev/';

// Function to fetch data from Cloudflare Worker
async function fetchSheetData() {
    try {
        const response = await fetch(WORKER_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        displayData(data.values);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('sheet-data').innerHTML = 'Error loading data.';
    }
}

// Function to display the fetched data
function displayData(values) {
    const container = document.getElementById('sheet-data');
    if (!values || values.length === 0) {
        container.innerHTML = 'No data found.';
        return;
    }

    let html = '<table border="1"><tr>';
    // Assuming first row is headers
    values[0].forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '</tr>';

    // Display selected rows (skip header if present)
    for (let i = 1; i < values.length; i++) {
        html += '<tr>';
        values[i].forEach(cell => {
            html += `<td>${cell}</td>`;
        });
        html += '</tr>';
    }
    html += '</table>';
    container.innerHTML = html;
}

// Load data on page load
window.onload = function() {
    fetchSheetData();
};

// For automatic updates, you can use setInterval
// setInterval(fetchSheetData, 60000); // Update every minute
