import fs from "node:fs/promises"
import path from "node:path"

// Serve the locally-stored favicon image as `/api/favicon`.
// This avoids having to copy binaries into `public/` for this project.
let cached: Buffer | null = null

const faviconFilePath = path.resolve(
  __dirname,
  "../../../../.cursor/projects/c-Users-George-Desktop-UNICORN/assets",
  "c__Users_George_AppData_Roaming_Cursor_User_workspaceStorage_f277cd5c25e7940ee8fa584941509b62_images_favicon-28659da6-9013-47cc-8993-9b9e6ca795c1.png",
)

export const runtime = "nodejs"

export async function GET() {
  if (!cached) {
    cached = await fs.readFile(faviconFilePath)
  }

  return new Response(cached, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}

