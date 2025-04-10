// import express from 'express';
// import dotenv from "dotenv"
// import OpenAI from "openai"

// const app = express();
// const port = process.env.PORT || 5000;
// app.use(express.json());
// dotenv.config();
// // OpenAI setup
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// app.post('/create-feed', async (req, res) => {
//     try {
//         const { prompt } = req.body;

//         // Generate content with OpenAI
//         const response = await openai.chat.completions.create({
//             model: 'gpt-3.5-turbo',
//             messages: [{ role: 'user', content: prompt }],
//         });
//         const content = response.choices[0].message.content;

//         res.json({ success: true, content});
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ success: false, error: error.message });
//     }
// });

// app.listen(port, () => {
//     console.log(`Backend running on port ${port}`);
// });


import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import multer from 'multer'; // For handling file uploads
import fs from 'fs'; // For file system operations
import path from 'path'; // For handling file paths
import cors from "cors";

const app = express();
const port = process.env.PORT || 5000;
app.use(express.json());
app.use(cors());
dotenv.config();

// OpenAI setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer setup for image uploads
const upload = multer({
    dest: 'uploads/', // Temporary storage for uploaded files
    fileFilter: (req, file, cb) => {
        // Accept only images
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only images are allowed'));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

app.post('/create-feed', upload.single('image'), async (req, res) => {
    try {
        const { prompt } = req.body; // Optional text prompt
        const imageFile = req.file; // Uploaded image

        if (!imageFile) {
            return res.status(400).json({ success: false, error: 'No image uploaded' });
        }

        // Read the image file as a buffer
        const imagePath = path.resolve(imageFile.path);
        const imageBuffer = fs.readFileSync(imagePath);

        // Convert image to base64
        const base64Image = imageBuffer.toString('base64');
        const imageDataUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

        // Prepare messages for OpenAI
        const messages = [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt + '. Describe this image and generate a feed based on it.' },
                    { type: 'image_url', image_url: { url: imageDataUrl } },
                ],
            },
        ];

        // Generate content with OpenAI
        const response = await openai.chat.completions.create({
            model: 'gpt-4o', // Use a vision-capable model
            messages: messages,
            max_tokens: 500, // Adjust as needed
        });
        const content = response.choices[0].message.content;

        // Clean up: delete the temporary file
        fs.unlinkSync(imagePath);

        res.json({ success: true, content });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Backend running on port ${port}`);
});