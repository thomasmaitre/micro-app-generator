# Micro-App Generator

A web application that allows users to create, manage, and share micro-apps using OpenAI's GPT model. The application features a gallery of micro-apps and provides functionality to generate new micro-apps based on user requirements.

## Features

- **Gallery View**: Browse existing micro-apps with detailed information
- **Card Generation**: Generate Adaptive Cards using OpenAI's GPT model
- **Full Micro-App Generation**: Create complete micro-app configurations with multiple blocks
- **JSON Export**: Export micro-app configurations in JSON format
- **Category and Provider Filtering**: Filter micro-apps by categories and providers
- **Modern UI**: Responsive and user-friendly interface

## Technologies Used

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Database: MongoDB
- AI Integration: OpenAI GPT-3.5
- Image Storage: ImgBB

## Setup

1. Clone the repository
```bash
git clone https://github.com/thomasmaitre/micro-app-generator.git
cd micro-app-generator
```

2. Install dependencies
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies (if any)
cd ..
npm install
```

3. Set up environment variables
Create a `.env` file in the server directory with the following variables:
```
MONGODB_URI=your_mongodb_uri
OPENAI_API_KEY=your_openai_api_key
IMGBB_API_KEY=your_imgbb_api_key
NODE_ENV=development
```

4. Start the server
```bash
cd server
npm run start
```

5. Open the application
Open `index.html` in your browser or serve it using a local server.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
