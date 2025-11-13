const express = require("express");
const sql = require("mssql");
const dotenv = require("dotenv");


dotenv.config();


const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

