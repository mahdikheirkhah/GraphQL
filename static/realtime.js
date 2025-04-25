
let UserID;
const name = document.getElementById("page-title");
const Inforamtion_basic = document.getElementById("basic-information");
const audits_div = document.getElementById("audits");
const loggedAs = document.getElementById("logged-as");

function login() {
    const usernameOrEmail = document.getElementById('username-or-email').value.trim();
    const password = document.getElementById('password-login').value.trim();
    const credentials = btoa(`${usernameOrEmail}:${password}`);

    fetch('https://01.gritlab.ax/api/auth/signin', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`
        }
    })
    .then(res => {
        if (!res.ok) throw new Error("Login failed");
        return res.text();
    })
    .then(jwt => {
        jwt = jwt.replace(/^"|"$/g, '');  // Remove quotes
        if (!jwt || jwt.length < 100) throw new Error("Invalid JWT");
        console.log("Cleaned JWT:", jwt);
        localStorage.setItem('jwt', jwt);
        showInformation(jwt);
    })
    
    .catch(err => {
        console.error("Login error:", err);
        document.getElementById('errorMessageLogin').textContent = err.message;
    });
}


function openLogin() {
    document.getElementById('login-section').style.display = 'flex';
    document.getElementById("information-section").style.display = 'none';
}

export function logout() {
    localStorage.removeItem('jwt');
    openLogin();
}

function isJWTValid(jwt) {
    try {
        const payload = JSON.parse(atob(jwt.split('.')[1]));
        const exp = payload.exp;
        const now = Math.floor(Date.now() / 1000);
        return exp && now < exp;
    } catch (e) {
        console.error("Invalid JWT structure", e);
        return false;
    }
}

function showInformation(JWT) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('information-section').style.display = 'block';
    calculateXP(JWT);
   
    gettingSkills(JWT);
    gettingAuditors(JWT);
    gettingBasicInforamtion(JWT);
    
}

addEventListener("DOMContentLoaded", function () {
    document.querySelector('#login-button').addEventListener('click', login);
    document.querySelector('#logout-button').addEventListener('click', logout);
    const jwt = localStorage.getItem('jwt');
    if (jwt && isJWTValid(jwt)) {
        fetch('https://01.gritlab.ax/api/graphql-engine/v1/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${jwt}`
            },
            body: JSON.stringify({  query: basicInforamtion }),
        }).then(res => {
            if (res.ok) {
                showInformation(jwt)
            } else {
                // Token is invalid or expired
                localStorage.removeItem('jwt');
                openLogin();
            }
        });
    } else {
        openLogin();
    }
});

const basicInforamtion = `
    query {
        user {
            attrs
            auditRatio
            id
            login
        }
    }
`;

const xps = `
  query {
    user {
      xps {
        amount
        originEventId
        path
        userId
      }
    }
  }
`;


const skills = `
    query {
        transaction{
            type
            amount
        }    
    }
`;

const audits =
`
query {
  user {
    audits {
      createdAt
      closureType
      grade
      group {
        object {
            name
        }
        id
        path
        captainLogin
        status
      }
    }
  }
}`;

export const xpFromTransactionQuery = [`
    {
      transaction(
        where: {_and: [{userId: {_eq: `, `}}, {type: {_eq: "xp"}}]}
        order_by: {createdAt: asc}
      ) {
        amount
        createdAt
        path
      }
    }`
];

function calculateXP(JWT){
    fetch('https://01.gritlab.ax/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT}`
        },
        body: JSON.stringify({  query: xps }),
      })
        .then(res => res.json())
        .then(data => {
          let xps;
          if (Array.isArray(data.data.user)){ //&& data.user.length > 0) {
            xps = data.data.user[0].xps;
            // do something with xps
          } else {
            console.error("Unexpected user data:", data);
          }
      
          const piscineJsXps = xps.filter(xp => (xp.path.startsWith('/gritlab/school-curriculum') && !xp.path.includes('/gritlab/school-curriculum/piscine-'))||(xp.path.endsWith('piscine-js')));
          const totalAmount = piscineJsXps.reduce((sum, xp) => sum + xp.amount, 0);
          Inforamtion_basic.innerHTML += `xps: ${ Math.round(totalAmount / 1000)} KB`;
          console.log("total amount:", totalAmount);
        })
        .catch(err => console.error('Error:', err));
}

function gettingBasicInforamtion(JWT){
    fetch('https://01.gritlab.ax/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT}`
        },
        body: JSON.stringify({  query: basicInforamtion }),
      })
        .then(res => res.json())
        .then(data => {
            name.innerHTML = `Hello ${data.data.user[0].attrs.firstName} ${data.data.user[0].attrs.lastName}`;

            Inforamtion_basic.innerHTML = `first name: ${data.data.user[0].attrs.firstName} \nlast name: ${data.data.user[0].attrs.lastName}\n audit ratio: ${Number(data.data.user[0].auditRatio.toFixed(1))}`
            UserID = data.data.user[0].id;
            console.log("userID is:", UserID);
            console.log(data.data.user[0].auditRatio);
            loggedAs.innerText = `logged in as ${data.data.user[0].login}` 
            getGraphData();
        })
        .catch(err => console.error('Error:', err));
}

function gettingSkills(JWT){
    fetch('https://01.gritlab.ax/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT}`
        },
        body: JSON.stringify({  query: skills }),
      })
        .then(res => res.json())
        .then(data => {
            let skillValueMap = new Map();
            for(let i = data.data.transaction.length - 1; i >= 0; i-- ){
                if (data.data.transaction[i].type.startsWith("skill_") && (!skillValueMap.has(data.data.transaction[i].type) ||skillValueMap.get(data.data.transaction[i].type) < data.data.transaction[i].amount)){
                    skillValueMap.set(data.data.transaction[i].type, data.data.transaction[i].amount)
                }
            } 
            console.log(skillValueMap);
            document.getElementById('radar-chart').innerHTML = radarChart(skillValueMap);
        })
        .catch(err => console.error('Error:', err));
}

function gettingAuditors(JWT){
    fetch('https://01.gritlab.ax/api/graphql-engine/v1/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${JWT}`
        },
        body: JSON.stringify({  query: audits }),
      })
        .then(res => res.json())
        .then(data => {
            let audits = data.data.user[0].audits;
            for(let i = 0; i < audits.length; i++ ){
                if (audits[i].closureType === "succeeded"){
                    console.log("your audit history:")
                    showAudits(audits[i])
                } else if (audits[i].closureType === "failed") {
                    showAudits(audits[i])
                }
                 else if (audits[i].closureType === null) {
                    console.log("ongoing audits: ")
                    showAudits(audits[i])
                } else if (audits[i].closureType === "expired" && audits[i].group.status === "audit") {
                    console.log("expierd")
                    showAudits(audits[i]) 
                }
            } 
        })
        .catch(err => console.error('Error:', err));
}
function showAudits(audit) {

    const status = audit.closureType;
    let statusText = "";
    let statusColor = "";

    switch (status) {
        case "succeeded":
            statusText = "Succeeded";
            statusColor = "green";
            break;
        case "failed":
            statusText = "Failed";
            statusColor = "red";
            break;
        case "expired":
            statusText = "Expired";
            statusColor = "goldenrod"; // yellowish color
            break;
        case null:
            statusText = "To Do";
            statusColor = "gray";
            break;
        default:
            statusText = "Unknown";
            statusColor = "black";
    }

    const card = document.createElement("div");
    card.className = "audit-card";
    
    card.innerHTML = `
        <h3 style="margin: 0 0 8px 0;">${audit.group.object.name}</h3>
        <p style="margin: 0 0 8px 0;"><strong>Captain:</strong> ${audit.group.captainLogin}</p>
        <p style="margin: 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></p>
    `;

    audits_div.appendChild(card);
} 

function radarChart(skillData) {
    if (!skillData || skillData.size === 0) {
        return '<svg width="600" height="600"><text x="300" y="300" text-anchor="middle">No data provided</text></svg>';
    }

    // Chart configuration
    const centerX = 300;
    const centerY = 300;
    const maxRadius = 250;
    const levels = 5;
    const angleSlice = (2 * Math.PI) / skillData.size;
    
    // Create SVG
    let svg = `<svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="overflow: visible">`;
    
    // Draw background circles (web)
    for (let level = 1; level <= levels; level++) {
        const radius = (maxRadius * level) / levels;
        svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#ddd" stroke-width="0.5"/>`;
    }
    
    // Draw axes (spokes)
    const skills = Array.from(skillData.keys());
    skills.forEach((skill, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const x = centerX + maxRadius * Math.cos(angle);
        const y = centerY + maxRadius * Math.sin(angle);
        
        // Draw axis line
        svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#ddd" stroke-width="0.5"/>`;
        
        // Add skill name label with edge detection
        const labelDistance = maxRadius + 20;
        let labelX = centerX + labelDistance * Math.cos(angle);
        let labelY = centerY + labelDistance * Math.sin(angle);
        
        // const padding = 50;
        // if (labelX < padding) labelX = padding;
        // if (labelX > 600 - padding) labelX = 600 - padding;
        // if (labelY < padding){ 
        //     console.log("yeeeee");
        //     labelY = padding;}
        // if (labelY > 600 - padding) labelY = 600 - padding;
        skill = skill.slice(6);
        const anchor = angle > Math.PI/2 && angle < 3*Math.PI/2 ? "end" : "start";
        svg += `<text x="${labelX}" y="${labelY}" text-anchor="${anchor}" font-size="12" fill="#fff">${skill}</text>`;
    });
    
    // Rest of your existing code for drawing the polygon and points...
    // Draw data polygon
    let points = [];
    skills.forEach((skill, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const value = skillData.get(skill);
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        points.push(`${x},${y}`);
    });
    
    svg += `<polygon points="${points.join(' ')}" fill="rgba(75, 192, 192, 0.2)" stroke="rgba(75, 192, 192, 1)" stroke-width="1.5"/>`;
    
    // Add data points
    skills.forEach((skill, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const value = skillData.get(skill);
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="rgba(75, 192, 192, 1)"/>`;
    });
    
    svg += `</svg>`;
    return svg;
}
async function runQuery(queryArg) {
    const token = localStorage.getItem("jwt");

    try {
        const res = await fetch("https://01.gritlab.ax/api/graphql-engine/v1/graphql", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                query: queryArg
            })
        });

        const data = await res.json();
        if (data.errors) {
            console.log(data.errors[0].message);
            console.error("Error parsing response:", data.errors[0].message);
            //contentErrorMessage.textContent = data.errors[0].message;
            return;
        }
        //contentErrorMessage.textContent = '';
        return data.data;

    } catch (error) {
        console.error("Data request failed:", error);
        //contentErrorMessage.textContent = error;
    }
}
export async function getGraphData() {

    const data = await runQuery(xpFromTransactionQuery[0] + String(UserID) + xpFromTransactionQuery[1]);
    const xp = [];
    data.transaction.forEach(ta => {
        if (
            (!ta.path.includes('piscine-go') && !ta.path.includes('piscine-js')) ||
            ta.path.endsWith('piscine-js')
        ) {            
            const time = new Date(ta.createdAt).getTime()
            const project = String(ta.path).split(`/`).pop();
            xp.push({ 'amount': ta.amount, 'awarded': time, 'project': project})
        }
    });
    document.getElementById('linear-chart').innerHTML = createXPGrowthChart(xp);
    console.log("graph line:",xp);
    return xp; 
}

function createXPGrowthChart(xpData) {
    // Validate input
    if (!xpData || xpData.length === 0) {
        return '<svg width="600" height="400"><text x="300" y="200" text-anchor="middle">No XP data available</text></svg>';
    }

    // Month names for display
    const monthNames = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];

    // Format number with k suffix
    const formatXP = (xp) => {
        return (xp / 1000).toFixed(xp % 1000 === 0 ? 0 : 1) + 'k';
    };

    // Process data - sort by date and calculate cumulative XP
    const processedData = xpData
        .map(item => ({
            date: new Date(item.awarded),
            xp: item.amount,
            project: item.project
        }))
        .sort((a, b) => a.date - b.date);
    
    // Calculate cumulative XP
    let cumulativeXP = 0;
    const chartData = processedData.map(item => {
        cumulativeXP += item.xp;
        return {
            date: item.date,
            xp: item.xp,
            cumulativeXP: cumulativeXP,
            project: item.project,
            // Formatted versions for display
            formattedDate: `${monthNames[item.date.getMonth()]} ${item.date.getFullYear()}`,
            formattedXP: formatXP(item.xp),
            formattedCumulativeXP: formatXP(cumulativeXP)
        };
    });

    // Chart configuration
    const width = 800;
    const height = 500;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Find date range and max XP for scaling
    const dates = chartData.map(d => d.date);
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const maxXP = Math.max(...chartData.map(d => d.cumulativeXP));

    // Create SVG
    let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Add title
    svg += `<text x="${width/2}" y="${margin.top/2}" text-anchor="middle" font-size="16" font-weight="bold">XP Growth Over Time</text>`;
    
    // Create chart area
    svg += `<g transform="translate(${margin.left}, ${margin.top})">`;
    
    // X-axis (time)
    const xScale = (date) => {
        const timeDiff = maxDate - minDate;
        const pos = (date - minDate) / timeDiff;
        return pos * innerWidth;
    };
    
    // Y-axis (XP)
    const yScale = (xp) => innerHeight - (xp / maxXP) * innerHeight;
    
    // Draw grid lines
    // Horizontal (XP) grid lines
    const yGridLines = 5;
    for (let i = 0; i <= yGridLines; i++) {
        const yVal = (maxXP / yGridLines) * i;
        const yPos = yScale(yVal);
        svg += `<line x1="0" y1="${yPos}" x2="${innerWidth}" y2="${yPos}" stroke="#eee" stroke-width="1"/>`;
        svg += `<text x="-5" y="${yPos + 4}" text-anchor="end" font-size="10" fill="#666">${formatXP(yVal)}</text>`;
    }
    
    // Vertical (time) grid lines
    const xGridLines = Math.min(6, chartData.length); // Don't show more than 6 grid lines
    for (let i = 0; i <= xGridLines; i++) {
        const date = new Date(minDate.getTime() + (i/xGridLines) * (maxDate - minDate));
        const xPos = xScale(date);
        const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        svg += `<line x1="${xPos}" y1="0" x2="${xPos}" y2="${innerHeight}" stroke="#eee" stroke-width="1"/>`;
        svg += `<text x="${xPos}" y="${innerHeight + 15}" text-anchor="middle" font-size="10" fill="#666">${monthYear}</text>`;
    }
    
    // Draw the XP growth line
    let pathData = `M ${xScale(chartData[0].date)} ${yScale(chartData[0].cumulativeXP)}`;
    for (let i = 1; i < chartData.length; i++) {
        pathData += ` L ${xScale(chartData[i].date)} ${yScale(chartData[i].cumulativeXP)}`;
    }
    svg += `<path d="${pathData}" fill="none" stroke="#4bc0c0" stroke-width="2"/>`;
    
    // Add data points
    chartData.forEach((data, i) => {
        const x = xScale(data.date);
        const y = yScale(data.cumulativeXP);
        
        svg += `<circle cx="${x}" cy="${y}" r="2" fill="#4bc0c0" stroke="#fff" stroke-width="1"/>`;
        
        // Add tooltip area with formatted values
        svg += `<rect x="${x - 10}" y="${y - 10}" width="20" height="20" fill="transparent">
                <title>${data.project}: +${data.formattedXP} XP\nTotal: ${data.formattedCumulativeXP} XP\n${data.formattedDate}</title>
                </rect>`;
    });
    
    // Close chart area group
    svg += `</g>`;
    
    // Add axis labels
    svg += `<text x="${width/2}" y="${height - 10}" text-anchor="middle" font-size="12">Date</text>`;
    svg += `<text x="10" y="${height/2}" text-anchor="middle" font-size="12" transform="rotate(-90, 10, ${height/2}) translate(0, -40)">Cumulative XP (in thousands)</text>`;
    
    svg += `</svg>`;
    return svg;
}