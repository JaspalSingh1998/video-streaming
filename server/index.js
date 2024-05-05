import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { exec } from "child_process";

const app = express();

// multer middleware
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      file.originalname + "-" + uuidv4() + path.extname(file.originalname)
    );
  },
});

// multer configuration
const upload = multer({ storage });

// Cors middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// this is our temporary storage for lessons
const lessons = {};

// upload route handler
app.post("/uploads", upload.single("file"), function (req, res) {
  // convert video in HLS format
  const lessonId = uuidv4(); // Corrected variable name
  const videoPath = req.file.path;
  const outputPath = `./uploads/course/${lessonId}`;
  const hlsPath = `${outputPath}/index.m3u8`; // Corrected variable name
  // if the output directory doesn't exist, create it
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  // command to convert video to HLS format using ffmpeg

  const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;
  // run the ffmpeg command; usually done in a separate process (queued)
  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
    const videoUrl = `http://localhost:4000/uploads/course/${lessonId}/index.m3u8`;
    res.json({
      message: "Video converted to HLS format",
      videoUrl: videoUrl,
      lessonId: lessonId,
    });
  });
});

app.get("/", (req, res) => {
  res.json({ msg: "Hello World!" });
});

app.listen(4000, () => {
  console.log("Example app listening on port 4000!");
});
