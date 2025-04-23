
let UserID;
export const feed = document.getElementById('posts-feed');
const name = document.getElementById("page-title");
const Inforamtion_basic = document.getElementById("basic-information");
const audits_div = document.getElementById("audits");

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
    gettingBasicInforamtion(JWT);
    gettingSkills(JWT);
    gettingAuditors(JWT);
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
          Inforamtion_basic.innerHTML += `xps: ${totalAmount}`
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
            
            Inforamtion_basic.innerHTML = `first name: ${data.data.user[0].attrs.firstName} \nlast name: ${data.data.user[0].attrs.lastName}\n audit ratio: ${(data.data.user[0].auditRatio)}`
            UserID = data.data.user[0].id;
            console.log(data.data.user[0].auditRatio);
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

function showAudits(audit){
    let new_audit_div = document.createElement("li");
    new_audit_div.innerHTML = `${audit.group.object.name}-${audit.group.captainLogin}-${audit.closureType}`
    audits_div.appendChild(new_audit_div);
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
        svg += `<text x="${labelX}" y="${labelY}" text-anchor="${anchor}" font-size="12" fill="#333">${skill}</text>`;
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

export async function getGraphData(usrId) {
    const data = await runQuery(xpFromTransactionQuery[0] + usrId + xpFromTransactionQuery[1]);

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
    return xp;
}