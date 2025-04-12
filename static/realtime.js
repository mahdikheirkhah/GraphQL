

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