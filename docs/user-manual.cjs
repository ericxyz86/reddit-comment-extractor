const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        Header, Footer, AlignmentType, LevelFormat, HeadingLevel,
        BorderStyle, WidthType, ShadingType, VerticalAlign, PageNumber,
        PageBreak } = require('docx');

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };
const headerShading = { fill: "1a1a2e", type: ShadingType.CLEAR };
const altRowShading = { fill: "F5F5F5", type: ShadingType.CLEAR };

function makeCell(text, opts = {}) {
  const { bold, color, size, width, shading, align } = opts;
  return new TableCell({
    borders: cellBorders,
    width: width ? { size: width, type: WidthType.DXA } : undefined,
    shading: shading || undefined,
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: align || AlignmentType.LEFT,
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text, bold: bold || false, color: color || "333333", size: size || 22, font: "Arial" })]
    })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 52, bold: true, color: "1a1a2e", font: "Arial" },
        paragraph: { spacing: { before: 0, after: 120 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "1a1a2e", font: "Arial" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "2d2d5e", font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: "444488", font: "Arial" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "steps-main", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps-hosted", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps-local", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "steps-trouble", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-main", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullet-5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [
    // === COVER PAGE ===
    {
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "Reddit Comment Extractor", size: 60, bold: true, color: "1a1a2e", font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "User Manual", size: 40, color: "6366f1", font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "Agile Intelligence", size: 28, bold: true, color: "555555", font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [new TextRun({ text: "DDB Group Philippines", size: 24, color: "777777", font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "February 2026", size: 24, color: "999999", font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Version 2.0 \u2014 SociaVault + Local Mode", size: 20, color: "AAAAAA", font: "Arial" })]
        }),
      ]
    },

    // === MAIN CONTENT ===
    {
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Reddit Comment Extractor \u2014 User Manual", size: 18, color: "999999", font: "Arial", italics: true })
          ]
        })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Agile Intelligence \u00B7 Page ", size: 18, color: "999999", font: "Arial" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "999999", font: "Arial" }),
          ]
        })] })
      },
      children: [
        // ─── 1. OVERVIEW ───
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Overview")] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "The Reddit Comment Extractor is a tool that searches Reddit for posts matching your keywords across specified subreddits, then extracts all comments from those posts. It\u2019s designed for social listening, competitive intelligence, and sentiment analysis.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "The tool supports two modes of operation:", size: 22, font: "Arial", bold: true })]
        }),

        new Table({
          columnWidths: [2200, 3500, 3660],
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                makeCell("Mode", { bold: true, color: "FFFFFF", width: 2200, shading: headerShading }),
                makeCell("How It Works", { bold: true, color: "FFFFFF", width: 3500, shading: headerShading }),
                makeCell("When to Use", { bold: true, color: "FFFFFF", width: 3660, shading: headerShading }),
              ]
            }),
            new TableRow({ children: [
              makeCell("Hosted (SociaVault)", { bold: true, width: 2200 }),
              makeCell("Access via reddit.aiailabs.net. Uses SociaVault API for Reddit data. Works from any device/browser.", { width: 3500 }),
              makeCell("Default mode. Use this for everyday work. No setup needed.", { width: 3660 }),
            ]}),
            new TableRow({ children: [
              makeCell("Local (Mac Mini)", { bold: true, width: 2200, shading: altRowShading }),
              makeCell("Run on Mac Mini (192.168.68.60). Connects directly to Reddit. Requires same WiFi network.", { width: 3500, shading: altRowShading }),
              makeCell("Backup if SociaVault is down or credits run out.", { width: 3660, shading: altRowShading }),
            ]}),
          ]
        }),

        // ─── 2. HOSTED MODE (PRIMARY) ───
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Hosted Mode (Primary) \u2014 reddit.aiailabs.net")] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "This is the recommended method. It works from any device with a browser \u2014 laptop, phone, or tablet. No technical setup required.", size: 22, font: "Arial" })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 How to Access")] }),
        new Paragraph({
          numbering: { reference: "steps-hosted", level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Open your browser and go to: ", size: 22, font: "Arial" }),
            new TextRun({ text: "https://reddit.aiailabs.net", size: 22, font: "Arial", bold: true, color: "6366f1" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "steps-hosted", level: 0 },
          spacing: { after: 100 },
          children: [new TextRun({ text: "You\u2019ll see a Cloudflare Access login page. Click \u201CSign in with Google\u201D and use your company Google account.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "steps-hosted", level: 0 },
          spacing: { after: 200 },
          children: [new TextRun({ text: "After login, you\u2019ll see the Reddit Comment Extractor interface. You\u2019re ready to go.", size: 22, font: "Arial" })]
        }),

        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: "Note: ", size: 22, font: "Arial", bold: true }), new TextRun({ text: "If you see \u201CAccess Denied\u201D, your Google account may not be authorized. Contact Eric Pena to add your email.", size: 22, font: "Arial" })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Extracting Comments")] }),
        new Paragraph({
          numbering: { reference: "steps-main", level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Add Subreddits: ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "Type a subreddit name (without r/) in the input field and press Enter or comma. Examples: phcars, CarsPH, Gulong, Philippines", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "steps-main", level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Set Keywords: ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "Enter search keywords using Boolean operators. Examples:", size: 22, font: "Arial" }),
          ]
        }),
        // Boolean keyword examples
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 1080 },
          children: [
            new TextRun({ text: "byd OR kia", size: 22, font: "Courier New", color: "6366f1" }),
            new TextRun({ text: " \u2014 finds posts mentioning either brand", size: 20, font: "Arial", color: "777777" }),
          ]
        }),
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 1080 },
          children: [
            new TextRun({ text: "toyota AND recall", size: 22, font: "Courier New", color: "6366f1" }),
            new TextRun({ text: " \u2014 finds posts mentioning both words", size: 20, font: "Arial", color: "777777" }),
          ]
        }),
        new Paragraph({
          spacing: { after: 100 },
          indent: { left: 1080 },
          children: [
            new TextRun({ text: "(byd OR kia) AND price", size: 22, font: "Courier New", color: "6366f1" }),
            new TextRun({ text: " \u2014 complex query with grouping", size: 20, font: "Arial", color: "777777" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "steps-main", level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Set Date Range: ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "Pick the Start Date and End Date for the posts you want to search. Note: Reddit\u2019s search API returns recent posts first. Very old posts (>6 months) may not appear in results.", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "steps-main", level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Click \u201CExtract Comments\u201D: ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "The tool will search each subreddit, find matching posts, then fetch comments from each post. You\u2019ll see the comment count update in real-time as it processes.", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "steps-main", level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Download Results: ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "Once extraction is complete, click \u201CDownload as Excel\u201D to save the results as an .xlsx file.", size: 22, font: "Arial" }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Understanding the Results")] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "The extracted comments table and Excel file contain the following columns:", size: 22, font: "Arial" })]
        }),
        new Table({
          columnWidths: [2000, 7360],
          rows: [
            new TableRow({ tableHeader: true, children: [
              makeCell("Column", { bold: true, color: "FFFFFF", width: 2000, shading: headerShading }),
              makeCell("Description", { bold: true, color: "FFFFFF", width: 7360, shading: headerShading }),
            ]}),
            new TableRow({ children: [
              makeCell("Subreddit", { bold: true, width: 2000 }),
              makeCell("Which subreddit the comment came from (e.g., phcars, CarsPH)", { width: 7360 }),
            ]}),
            new TableRow({ children: [
              makeCell("Author", { bold: true, width: 2000, shading: altRowShading }),
              makeCell("Reddit username of the commenter", { width: 7360, shading: altRowShading }),
            ]}),
            new TableRow({ children: [
              makeCell("Comment", { bold: true, width: 2000 }),
              makeCell("The full text of the comment", { width: 7360 }),
            ]}),
            new TableRow({ children: [
              makeCell("Upvotes", { bold: true, width: 2000, shading: altRowShading }),
              makeCell("Number of upvotes (likes) the comment received. Higher = more community agreement.", { width: 7360, shading: altRowShading }),
            ]}),
            new TableRow({ children: [
              makeCell("Date", { bold: true, width: 2000 }),
              makeCell("Date the comment was posted (YYYY-MM-DD format)", { width: 7360 }),
            ]}),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.4 Credit Usage")] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "The hosted version uses SociaVault API credits. Each API call costs 1 credit:", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullet-main", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Searching a subreddit: ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "1 credit", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullet-main", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Fetching comments from a post: ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "1 credit", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullet-main", level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Typical full extraction (4 subreddits, ~100 posts): ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "~104 credits", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Credits are shared across the team. Be mindful of usage \u2014 avoid running unnecessary extractions with very broad keywords or excessive date ranges.", size: 22, font: "Arial", italics: true, color: "666666" })]
        }),

        // ─── 3. LOCAL MODE (BACKUP) ───
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Local Mode (Backup) \u2014 Mac Mini")] }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "Use this method only if reddit.aiailabs.net is unavailable or SociaVault credits are depleted. This runs the app directly on the office Mac Mini and connects to Reddit without any API credits.", size: 22, font: "Arial" })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Requirements")] }),
        new Paragraph({
          numbering: { reference: "bullet-2", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Your laptop must be connected to the same WiFi network as the Mac Mini", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullet-2", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "The Mac Mini must be powered on (it\u2019s always on in the office)", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullet-2", level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Mac Mini IP address: ", size: 22, font: "Arial" }),
            new TextRun({ text: "192.168.68.60", size: 22, font: "Courier New", bold: true, color: "6366f1" }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 One-Time Setup (First Time Only)")] }),
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: "You need to install the app on your laptop once. Open Terminal (search for \u201CTerminal\u201D in Spotlight) and run these commands:", size: 22, font: "Arial" })]
        }),

        // Command blocks
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Step 1: Clone the repository")] }),
        new Paragraph({
          spacing: { after: 100 },
          shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [new TextRun({ text: "cd ~/Desktop && git clone https://github.com/ericxyz86/reddit-comment-extractor.git", size: 20, font: "Courier New", color: "333333" })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Step 2: Install dependencies")] }),
        new Paragraph({
          spacing: { after: 100 },
          shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [new TextRun({ text: "cd ~/Desktop/reddit-comment-extractor && npm install", size: 20, font: "Courier New", color: "333333" })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Step 3: Create config file")] }),
        new Paragraph({
          spacing: { after: 200 },
          shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
          indent: { left: 360 },
          children: [new TextRun({ text: "echo \"VITE_BACKEND_URL=http://192.168.68.60:3002\" > .env.local", size: 20, font: "Courier New", color: "333333" })]
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [new TextRun({ text: "This tells your laptop to use the Mac Mini\u2019s backend server (which can access Reddit).", size: 22, font: "Arial", italics: true, color: "666666" })]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.3 Running the App (Each Time)")] }),
        new Paragraph({
          numbering: { reference: "steps-local", level: 0 },
          spacing: { after: 100 },
          children: [new TextRun({ text: "Make sure the Mac Mini backend is running. Ask Eric or Nox to start it if needed.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "steps-local", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Open Terminal on your laptop and run:", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          spacing: { after: 100 },
          shading: { fill: "F0F0F0", type: ShadingType.CLEAR },
          indent: { left: 1080 },
          children: [new TextRun({ text: "cd ~/Desktop/reddit-comment-extractor && npm run dev", size: 20, font: "Courier New", color: "333333" })]
        }),
        new Paragraph({
          numbering: { reference: "steps-local", level: 0 },
          spacing: { after: 100 },
          children: [
            new TextRun({ text: "Open your browser and go to: ", size: 22, font: "Arial" }),
            new TextRun({ text: "http://localhost:3001", size: 22, font: "Arial", bold: true, color: "6366f1" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "steps-local", level: 0 },
          spacing: { after: 100 },
          children: [new TextRun({ text: "Use the app exactly the same as the hosted version (same interface, same workflow).", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "steps-local", level: 0 },
          spacing: { after: 200 },
          children: [new TextRun({ text: "When done, go back to Terminal and press Ctrl+C to stop the app.", size: 22, font: "Arial" })]
        }),

        // ─── 4. TIPS & BEST PRACTICES ───
        new Paragraph({ children: [new PageBreak()] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. Tips & Best Practices")] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Getting Better Results")] }),
        new Paragraph({
          numbering: { reference: "bullet-3", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Be specific with keywords. ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "\u201Cbyd atto 3\u201D is better than just \u201Cbyd\u201D if you want EV-specific discussions.", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullet-3", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Use relevant subreddits. ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "r/phcars and r/CarsPH are great for Philippine car discussions. r/Philippines is broader but catches lifestyle mentions.", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullet-3", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Keep date ranges reasonable. ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "1\u20133 months gives the best results. Reddit\u2019s search doesn\u2019t reliably return very old posts.", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullet-3", level: 0 },
          spacing: { after: 200 },
          children: [
            new TextRun({ text: "Check comment count in results. ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "If you get 0 comments, try broadening your keywords or adding more subreddits.", size: 22, font: "Arial" }),
          ]
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.2 Saving Credits (Hosted Mode)")] }),
        new Paragraph({
          numbering: { reference: "bullet-4", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Don\u2019t run the same extraction multiple times \u2014 download the Excel file and reuse it.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullet-4", level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: "Use fewer subreddits if you only need data from specific communities.", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullet-4", level: 0 },
          spacing: { after: 200 },
          children: [new TextRun({ text: "Narrow date ranges = fewer posts to process = fewer credits used.", size: 22, font: "Arial" })]
        }),

        // ─── 5. TROUBLESHOOTING ───
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Troubleshooting")] }),

        new Table({
          columnWidths: [3120, 3120, 3120],
          rows: [
            new TableRow({ tableHeader: true, children: [
              makeCell("Problem", { bold: true, color: "FFFFFF", width: 3120, shading: headerShading }),
              makeCell("Cause", { bold: true, color: "FFFFFF", width: 3120, shading: headerShading }),
              makeCell("Solution", { bold: true, color: "FFFFFF", width: 3120, shading: headerShading }),
            ]}),
            new TableRow({ children: [
              makeCell("\"Access Denied\" on reddit.aiailabs.net", { width: 3120 }),
              makeCell("Google account not authorized", { width: 3120 }),
              makeCell("Contact Eric Pena to add your email to Cloudflare Access", { width: 3120 }),
            ]}),
            new TableRow({ children: [
              makeCell("0 comments extracted (hosted)", { width: 3120, shading: altRowShading }),
              makeCell("SociaVault credits depleted, or no matching posts", { width: 3120, shading: altRowShading }),
              makeCell("Check credits at SociaVault dashboard. Try different keywords. Switch to local mode.", { width: 3120, shading: altRowShading }),
            ]}),
            new TableRow({ children: [
              makeCell("0 comments extracted (local)", { width: 3120 }),
              makeCell("Mac Mini backend not running, or Reddit blocking IP", { width: 3120 }),
              makeCell("Ask Eric to restart the backend. Try again later.", { width: 3120 }),
            ]}),
            new TableRow({ children: [
              makeCell("\"Failed to fetch\" error", { width: 3120, shading: altRowShading }),
              makeCell("Backend server is down", { width: 3120, shading: altRowShading }),
              makeCell("Hosted: wait and retry. Local: ensure Mac Mini is on and backend is running.", { width: 3120, shading: altRowShading }),
            ]}),
            new TableRow({ children: [
              makeCell("Extraction is very slow", { width: 3120 }),
              makeCell("Many posts to process (rate-limited to 1/sec)", { width: 3120 }),
              makeCell("Normal behavior. 100 posts takes ~2 minutes. Use Cancel button if needed.", { width: 3120 }),
            ]}),
            new TableRow({ children: [
              makeCell("Can\u2019t connect in local mode", { width: 3120, shading: altRowShading }),
              makeCell("Not on same WiFi as Mac Mini", { width: 3120, shading: altRowShading }),
              makeCell("Connect to office WiFi. Verify with: ping 192.168.68.60", { width: 3120, shading: altRowShading }),
            ]}),
          ]
        }),

        // ─── 6. CONTACT ───
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Support")] }),
        new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: "For technical issues or to request access:", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          numbering: { reference: "bullet-5", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Eric Pena ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "\u2014 eric@agileintelligence.ph", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          numbering: { reference: "bullet-5", level: 0 },
          spacing: { after: 80 },
          children: [
            new TextRun({ text: "Nox (AI Assistant) ", size: 22, font: "Arial", bold: true }),
            new TextRun({ text: "\u2014 via Telegram or OpenClaw", size: 22, font: "Arial" }),
          ]
        }),
        new Paragraph({
          spacing: { before: 400, after: 100 },
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "\u2014 End of Manual \u2014", size: 20, color: "AAAAAA", font: "Arial", italics: true })]
        }),
      ]
    }
  ]
});

const outPath = '/Users/enricopena/Desktop/Reddit_Comment_Extractor_User_Manual.docx';
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`\u2705 User manual saved to: ${outPath}`);
});
