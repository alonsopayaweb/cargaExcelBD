// * PROTOTIPO PARA PROBAR FUNCIONALIDAD DE SUBIDA DE ARCHIVO EXCEL AL SISTEMA DE INVENTARIO
const express = require('express');
const path = require('path');
const mysql = require('mysql');
const xlsx = require('xlsx');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); 
const hbs = require('hbs'); // Importa hbs
const app = express();
const port = 3000;

// Define el helper 'eq' para realizar comparaciones de igualdad
hbs.registerHelper('eq', function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
});

// Configura la conexión a la base de datos MySQL
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'stockdbsys',
    password: 'Stockdb19250825',
    database: 'protocarga'
});

// Conecta a la base de datos MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error al conectar a la base de datos: ', err);
        return;
    }
    console.log('Conexión a la base de datos MySQL establecida');
});

// Configura el motor de plantillas hbs
app.set('view engine', 'hbs'); // Establece el motor de plantillas
app.set('views', path.join(__dirname, 'views')); // Establece la carpeta de vistas


// Configuración para usar archivos estáticos en la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de inicio
app.get('/', (req, res) => {
    res.render('index');
});

// Ruta para manejar la subida del archivo
app.post('/subir', upload.single('cargaInventario'), (req, res) => {
    // Aquí manejar la subida del archivo
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo.');
    }

    // El archivo se encuentra en req.file
    const archivo = req.file;

    // Lee el archivo Excel
    const workbook = xlsx.readFile(archivo.path);
    const sheet_name = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheet_name];

    // Opciones para sheet_to_json, especificando que comience desde la segunda fila (índice 1)
    const options = {
        header: 1,
        range: 1 // Comienza desde la segunda fila
    };

    const data = xlsx.utils.sheet_to_json(worksheet, options);

    // Trunca la tabla completa
    const truncateQuery = 'TRUNCATE TABLE protocarga.comparativa';
    connection.query(truncateQuery, (truncateError, truncateResults, truncateFields) => {
        if (truncateError) throw truncateError;

        // Inserta los nuevos datos en la base de datos
        const insertQuery = 'INSERT INTO protocarga.comparativa (id, nombre, precio, cantidad, stock, periodo) VALUES (?, ?, ?, ?, ?, ?)';
        data.forEach(row => {
            connection.query(insertQuery, row, (insertError, insertResults, insertFields) => {
                if (insertError) throw insertError;
                console.log('Datos insertados correctamente');
            });
        });

        res.redirect('/subido');
    });
});



// Ruta para mostrar información de Excel Subido
app.get('/subido', (req, res) => {
    // Consulta los datos de la base de datos
    const query = 'SELECT * FROM protocarga.existencias UNION SELECT * FROM protocarga.comparativa ORDER BY id;';
    connection.query(query, (error, results, fields) => {
        if (error) throw error;
        
        // Envía el archivo HTML 'subida.html' junto con los datos obtenidos de la base de datos
        res.render('subido', { data: results });
    });
});


// Función para convertir datos a una tabla HTML
function parseDataToHTMLTable(data) {
    let html = '<tr>';
    for (let key in data[0]) {
        html += `<th>${key}</th>`;
    }
    html += '</tr>';
    data.forEach(row => {
        html += '<tr>';
        for (let key in row) {
            html += `<td>${row[key]}</td>`;
        }
        html += '</tr>';
    });
    return html;
}

// Ruta para manejar la actualización de existencias
app.post('/actualizar-existencias', (req, res) => {
    const replaceQuery = `
        REPLACE INTO existencias (id, nombre, precio, cantidad, stock, periodo)
        SELECT id, nombre, precio, cantidad, stock, periodo
        FROM comparativa
    `;

    connection.query(replaceQuery, (error, results, fields) => {
        if (error) throw error;
        console.log('Existencias actualizadas correctamente');

        res.redirect('/inventario');
    });
});

// Ruta para mostar Existencia Final
app.get('/inventario', (req, res) => {

    const query = 'SELECT * FROM protocarga.existencias ORDER BY id;';
    connection.query(query, (error, results, fields) => {
        if (error) throw error;
        
        // Envía el archivo HTML 'inventario.html' junto con los datos obtenidos de la base de datos
        res.render('inventario', { data: results });
    });



});


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
