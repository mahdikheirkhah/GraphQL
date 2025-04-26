import { runQuery,isJWTValid,clearAllData } from "./utils.js";
import { xpFromTransactionQuery, xps, basicInforamtion, skills, audits} from "./queries.js";
import { createXPGrowthChart, radarChart } from "./charts.js";

let UserID;
const Inforamtion_basic = document.getElementById("basic-information");
const audits_div = document.getElementById("audits");
const loggedAs = document.getElementById("logged-as");

async function login() {
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
        if (!res.ok) throw new Error("Invalid credentials") ;
        return res.text();
    })
    .then(jwt => {
        jwt = jwt.replace(/^"|"$/g, '');  // Remove quotes
        if (!jwt || jwt.length < 100) throw new Error("Invalid JWT");
        console.log("Cleaned JWT:", jwt);
        localStorage.setItem('jwt', jwt);
        showInformation();
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
    clearAllData();
    openLogin();
}



function showInformation() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('information-section').style.display = 'block';
    gettingBasicInforamtion();

    gettingSkills();
    gettingAuditors();
    
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


async function calculateXP(){
    let data = await runQuery(xps);
    try{
        let xps;
        if (Array.isArray(data.user)) {
          xps = data.user[0].xps;
        } else {
          console.error("Unexpected user data:", data);
          return;
        }
    
        const piscineJsXps = xps.filter(xp => 
          (xp.path.startsWith('/gritlab/school-curriculum') && 
           !xp.path.includes('/gritlab/school-curriculum/piscine-')) ||
          (xp.path.endsWith('piscine-js'))
        );
        
        const totalAmount = Math.round(piscineJsXps.reduce((sum, xp) => sum + xp.amount, 0) / 1000);
        
        let element = document.createElement("li");
        element.innerHTML = `XP: ${totalAmount} KB`;
        
        
        // Append the XP element to basic information
        Inforamtion_basic.appendChild(element);
        
        console.log("total amount:", totalAmount);
    } catch(error){
        console.error("Data request failed:", error);
    }
}
async function gettingBasicInforamtion(){
    let data = await runQuery(basicInforamtion);
    try{
        let element1 = document.createElement("li");
        let element2 = document.createElement("li");
        let element3 = document.createElement("li");
        let element4 = document.createElement("li");
        
        element1.innerHTML = `First name: ${data.user[0].attrs.firstName}`;
        element2.innerHTML = `Last name: ${data.user[0].attrs.lastName}`;
        element3.innerHTML =  `Gender: ${data.user[0].attrs.gender}`;
        element4.innerHTML =  `Audit ratio: ${Number(data.user[0].auditRatio.toFixed(1))}`;
       
        Inforamtion_basic.appendChild(element1);
        Inforamtion_basic.appendChild(element2);
        Inforamtion_basic.appendChild(element3);
        Inforamtion_basic.appendChild(element4);
        
        UserID = data.user[0].id;
        loggedAs.innerText = `logged in as ${data.user[0].login}`;
        await Promise.resolve(); // Ensure previous operations complete
        calculateXP();
        getGraphData();
    } catch (error) {
        console.error("Data request failed:", error);
    }

}

async function gettingSkills(){
    let data = await runQuery(skills);
    try {
        let skillValueMap = new Map();
        for(let i = data.transaction.length - 1; i >= 0; i-- ){
            if (data.transaction[i].type.startsWith("skill_") && (!skillValueMap.has(data.transaction[i].type) || skillValueMap.get(data.transaction[i].type) < data.transaction[i].amount)){
                skillValueMap.set(data.transaction[i].type, data.transaction[i].amount)
            }
        }
        console.log(skillValueMap);
        document.getElementById('radar-chart').innerHTML = radarChart(skillValueMap);
    } catch (error) {
        console.error("Data request failed:", error);
    }
}


async function gettingAuditors(){
    let data = await runQuery(audits);
    try{
        let audits = data.user[0].audits;
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
    } catch (error) {
        console.error("Data request failed:", error);
    }
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


async function getGraphData() {

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
