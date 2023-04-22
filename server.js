const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());

const connection = mysql.createPool({
  connectionLimit : 10,
  acquireTimeout  : 10000,
  host: process.env.HOSTDB,
  port: process.env.PORTDB,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
});

connection.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL database");
});

app.get("/films", (req, res) => {
  const limit = req.query.limit || 10;
  const offset = req.query.offset || 0;
  const sortColumn = req.query.sortColumn || "title";
  const sortDirection = req.query.sortDirection || "asc";
  const currentPage = req.query.currentPage || 1;

  const query = `
    SELECT film.film_id, film.title, film.rental_rate, film.rating, category.name AS category_name, COUNT(film_category.category_id) AS category_count, COALESCE(N.nb_of_rent, 0) as nb_of_rent, COUNT(*) OVER() AS count
    FROM film
    LEFT JOIN film_category ON film.film_id = film_category.film_id
    LEFT JOIN category ON film_category.category_id = category.category_id
    LEFT JOIN (
        SELECT COUNT(p.rental_id) as nb_of_rent, i.film_id as film_id
        FROM rental as r
        INNER JOIN inventory as i ON i.inventory_id = r.inventory_id
        INNER JOIN payment as p ON r.rental_id = p.rental_id
        GROUP BY i.film_id
    ) as N ON N.film_id = film.film_id
    GROUP BY film.film_id
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT ${limit} OFFSET ${offset};
`;

  connection.query(query, (err, results) => {
    if (err) throw err;
    res.send(results);
  });

});




const port = process.env.PORT || 5000;

app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

const path = require("path");
app.use(express.static(path.join(__dirname, "../front/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../front/build/index.html"));
});
