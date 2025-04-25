export{ createXPGrowthChart, radarChart}

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
        return Math.round(xp / 1000) + 'KB';
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
    // svg += `<text x="${width/2}" y="${margin.top/2}" text-anchor="middle" font-size="16" font-weight="bold">XP Growth Over Time</text>`;
    
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

function radarChart(skillData) {
    if (!skillData || skillData.size === 0) {
        return '<svg width="600" height="600"><text x="300" y="300" text-anchor="middle" fill="#000">No data provided</text></svg>';
    }

    // Chart configuration
    const centerX = 300;
    const centerY = 300;
    const maxRadius = 250;
    const levels = 5;
    const angleSlice = (2 * Math.PI) / skillData.size;
    
    // Create SVG with white background
    let svg = `<svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg" style="overflow: visible; background-color: #fff">`;
    
    // Draw background circles (web) in black
    for (let level = 1; level <= levels; level++) {
        const radius = (maxRadius * level) / levels;
        svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="#000" stroke-width="0.5"/>`;
    }
    
    // Draw axes (spokes) in black
    const skills = Array.from(skillData.keys());
    skills.forEach((skill, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const x = centerX + maxRadius * Math.cos(angle);
        const y = centerY + maxRadius * Math.sin(angle);
        
        // Draw axis line
        svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="#000" stroke-width="1"/>`;
        
        // Add skill name label in black
        const labelDistance = maxRadius + 15;
        let labelX = centerX + labelDistance * Math.cos(angle);
        let labelY = centerY + labelDistance * Math.sin(angle);
        
        skill = skill.slice(6); // Remove "skill_" prefix
        const anchor = angle > Math.PI/2 && angle < 3*Math.PI/2 ? "end" : "start";
       svg += `<text x="${labelX}" y="${labelY}" text-anchor="${anchor}" 
        font-size="12" fill="#000000" style="fill: #000000 !important;" 
        font-family="Arial, sans-serif">${skill}</text>`;
;
    });
    
    // Draw data polygon in dark blue for contrast
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
    
    // Add data points in dark blue
    skills.forEach((skill, i) => {
        const angle = i * angleSlice - Math.PI / 2;
        const value = skillData.get(skill);
        const radius = (maxRadius * value) / 100;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="rgba(0, 0, 139, 1)"/>`;
    });
    
    svg += `</svg>`;
    return svg;
}
