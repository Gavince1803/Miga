const XLSX = require('xlsx');
const path = require('path');

// Sample Data
const data = [
    { Nombre: 'Harina de Trigo', Cantidad: 5000, Unidad: 'g', Minimo: 1000, Categoria: 'Ingredientes Secos' },
    { Nombre: 'Azúcar Blanca', Cantidad: 2000, Unidad: 'g', Minimo: 500, Categoria: 'Ingredientes Secos' },
    { Nombre: 'Huevos', Cantidad: 30, Unidad: 'u', Minimo: 12, Categoria: 'Frescos' },
    { Nombre: 'Leche Entera', Cantidad: 2000, Unidad: 'ml', Minimo: 1000, Categoria: 'Frescos' },
    { Nombre: 'Chocolate 70%', Cantidad: 500, Unidad: 'g', Minimo: 200, Categoria: 'Repostería' },
    { Nombre: 'Mantequilla Sin Sal', Cantidad: 1000, Unidad: 'g', Minimo: 250, Categoria: 'Frescos' },
    { Nombre: 'Polvo de Hornear', Cantidad: 100, Unidad: 'g', Minimo: 20, Categoria: 'Ingredientes Secos' },
    { Nombre: 'Esencia de Vainilla', Cantidad: 250, Unidad: 'ml', Minimo: 50, Categoria: 'Líquidos' }
];

// Create Workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);

// Add Worksheet to Workbook
XLSX.utils.book_append_sheet(wb, ws, "Inventario Inicial");

// Write to file in project root
const outputPath = path.join(__dirname, '..', 'inventory_template.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`✅ Template created at: ${outputPath}`);
console.log('You can transfer this file to your device or simulator to test import.');
