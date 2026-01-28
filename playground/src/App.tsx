import { useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const App = () => {
    const [rowData] = useState([
        { id: 101, make: "Toyota $19,999", model: "Celica 2024", price: 35000, updated: "2 mins ago", status: "Active" },
        { id: 102, make: "Ford $12,500", model: "Mondeo 2025", price: 32000, updated: "1 hour ago", status: "Pending" },
        { id: 103, make: "Porsche $99,000", model: "Boxster 2023", price: 72000, updated: "Jan 15th", status: "Sold" },
        { id: 104, make: "Tesla $45,000", model: "Model 3 2025", price: 42000, updated: "Today at 10:30", status: "Active" }
    ]);

    const [colDefs] = useState([
        { field: "id", headerName: "ID", width: 70 },
        { field: "make", headerName: "Make & Price", filter: true },
        { field: "model", headerName: "Model & Year" },
        { field: "price", headerName: "Base Price", sortable: true },
        {
            field: "status", headerName: "Status", cellRenderer: (p: any) => (
                <span style={{ color: p.value === 'Active' ? 'green' : 'red' }}>● {p.value}</span>
            )
        },
        { field: "updated", headerName: "Last Sync" }
    ]);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Playwright Locator Extension - Test Playground</h1>

            <div style={{ marginBottom: '30px', border: '1px solid #ccc', padding: '15px' }}>
                <h2>Standard Elements with Dynamic Text</h2>
                <p>Followers Check: <a>4.1K followers</a></p>
                <p>Price: <span>$19.99 sale</span></p>
                <p>Yearly Report: <a href="#">Is a Data Science Bootcamp Worth It in 2025?</a></p>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2>Nexus Components Simulation</h2>
                <div data-component="Header" className="nexus-header">
                    <button data-nexus-id="btn-998877" data-test-id="login-button">Nexus Login (Dynamic ID)</button>
                    <button data-nexus-id="btn-112233" className="nexus-btn-primary">Nexus Sign Up</button>
                </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2>AG-Grid Component</h2>
                <div className="ag-theme-alpine" style={{ height: 300, width: 800 }}>
                    <AgGridReact
                        rowData={rowData}
                        columnDefs={colDefs}
                    />
                </div>
            </div>

            <div style={{ marginBottom: '30px' }}>
                <h2>iFrame Container</h2>
                <div style={{ border: '2px dashed #666', padding: '10px' }}>
                    <iframe
                        src="/frame.html"
                        title="Inner Frame"
                        style={{ width: '100%', height: '200px', border: 'none' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default App;
