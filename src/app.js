import express from "express";

const app = express();

app.use(helmet());
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Laundry Pickup and Delivery Management System active",
  });
});

export default app;