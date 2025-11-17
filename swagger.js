const swaggerAutogen = require("swagger-autogen")();

const outputFile = "./swagger-output.json";
const routes = ["./server.js"];


const doc = {
  info: {
    title: "ATM API Documentation",
    description: "ATM Backend API Documentation; Done by Ansleigh, Yoshihero, David, Ei Shin and Xin hui :)"
  },
  host: "localhost:5000",
  schemes: ["http"]
};

swaggerAutogen(outputFile, routes, doc);