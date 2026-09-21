const fs = require("fs");

const username = "2000polo";
const token = process.env.GITHUB_TOKEN;

const query = `
  query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              weekday
            }
          }
        }
      }
    }
  }
`;

async function fetchContributions() {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-contribution-graph"
    },
    body: JSON.stringify({
      query,
      variables: {
        login: username
      }
    })
  });

  const result = await response.json();

  if (result.errors) {
    console.error(result.errors);
    process.exit(1);
  }

  return result.data.user.contributionsCollection.contributionCalendar;
}

function getLevel(count) {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

function getColor(level) {
  const colors = [
    "#161b22",
    "#0e4429",
    "#006d32",
    "#26a641",
    "#39d353"
  ];

  return colors[level];
}

function createSvg(calendar) {
  const cellSize = 12;
  const gap = 3;

  const cell = cellSize + gap;

  const leftPadding = 12;
  const topPadding = 12;

  const weeks = calendar.weeks;

  const width = leftPadding + weeks.length * cell + 12;
  const height = topPadding + 7 * cell + 12;

  const rects = [];

  weeks.forEach((week, weekIndex) => {
    week.contributionDays.forEach((day) => {
      const x = leftPadding + weekIndex * cell;
      const y = topPadding + day.weekday * cell;

      const level = getLevel(day.contributionCount);

      rects.push(`
        <rect
          x="${x}"
          y="${y}"
          width="${cellSize}"
          height="${cellSize}"
          rx="2"
          fill="${getColor(level)}"
        >
          <title>${day.date}: ${day.contributionCount} contributions</title>
        </rect>
      `);
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  role="img"
  aria-label="GitHub contribution graph for ${username}"
>
  <rect
    width="100%"
    height="100%"
    rx="8"
    fill="#010409"
  />

  ${rects.join("\n")}
</svg>
`;
}

async function main() {
  if (!token) {
    console.error("GITHUB_TOKEN is missing");
    process.exit(1);
  }

  console.log(`Fetching contributions for ${username}...`);

  const calendar = await fetchContributions();

  console.log(
    `Total contributions: ${calendar.totalContributions}`
  );

  const svg = createSvg(calendar);

  fs.mkdirSync("assets", {
    recursive: true
  });

  fs.writeFileSync(
    "assets/github-contributions.svg",
    svg
  );

  console.log(
    "Generated assets/github-contributions.svg"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
