# GraphQL Profile Dashboard


A personal profile dashboard that displays school information by querying a GraphQL API, featuring authentication, data visualization, and responsive design.

## Features

- **User Authentication**
  - Login with username/email and password
  - JWT token handling
  - Logout functionality
  - Error handling for invalid credentials

- **Profile Information**
  - Displays user identification details
  - Shows XP amount and progress
  - Presents skills and achievements

- **Data Visualization**
  - **Radar Chart**: Visualizes skill distribution
  - **Line Chart**: Shows XP progression over time
  - Both charts implemented with SVG

- **Technical Implementation**
  - GraphQL queries (simple, nested, and with arguments)
  - Responsive UI design
  - Clean, modern interface

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Charts**: Custom SVG implementations
- **Authentication**: JWT (JSON Web Tokens)
- **API**: GraphQL (with queries, mutations)
- **Hosting**: GitHub Pages

## GraphQL API Endpoints

- Main endpoint: `https://01.gritlab.ax/api/graphql-engine/v1/graphql`
- Authentication: `https://01.gritlab.ax/api/auth/signin`

## Project Structure
```
GraphQL/
│
├── index.html
├── app.js
├── style.css
├── charts.js
├── queries.js
├── utils.js
├── favicon.png
└── README.md
```


## Setup and Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mahdikheirkhah/GraphQL.git
   ```
2. Open the project in your browser:
    Simply open index.html in a modern browser

    Or visit the hosted version: https://mahdikheirkhah.github.io/GraphQL/

