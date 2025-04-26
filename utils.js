export {runQuery, isJWTValid, clearAllData}

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

function clearAllData() {
    // Clear basic information
    document.getElementById('basic-information').innerHTML = '';
    
    // Clear audit history
    document.getElementById('audits').innerHTML = '';
    
    // Clear charts
    document.getElementById('radar-chart').innerHTML = '';
    document.getElementById('linear-chart').innerHTML = '';

    document.getElementById('username-or-email').innerHTML = '';
    document.getElementById('password-login').innerHTML = '';
    document.getElementById('errorMessageLogin').innerHTML = '';
}
