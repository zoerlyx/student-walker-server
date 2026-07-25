import express from "express";
import clientRoutes from "./routes/client.js";
import stukerRoutes from "./routes/stuker.js";
import cors from "cors";
import { fileURLToPath } from "url";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "PUT", "POST", "DELETE"],
  },
  // pingInterval: 10000,
  // pingTimeout: 5000,
});

let orders = [];

//hello
const port = 3000;

app.use(express.json());
app.use(cors());
app.use("/client", clientRoutes);
app.use("/stuker", stukerRoutes);
//untuk mengizinkan akses ke uploads untuk ambil file gambar
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);
  socket.on("client-create-order", (orderData) => {
    console.log("Order created by client:", orderData);
    orders.push(orderData);
    socket.join(orderData.clientId);
    setTimeout(() => {
      io.emit("new-order", orderData);
      console.log("out");
    }, 5000);
  });

  socket.on("stuker-accept-order", (orderData) => {
    console.log("Stuker accepted order:", orderData);
    orders = orders.filter((order) => order.clientId !== orderData.clientId);

    setTimeout(() => {
      io.emit("order-accepted", orderData);
      console.log("send accept order to client");
    }, 5000);
  });
  socket.on("disconnect", () => {
    console.log("A client disconnected: ", socket.id);
  });
});
server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
