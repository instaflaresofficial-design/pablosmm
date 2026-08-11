/**
 * Service Name Sanitizer Utility
 * Converts noisy, weird provider service titles into clean, professional display titles
 * e.g., "1540 - Instagram Followers [30 Days Refill - 50K/D] [R30] [SUPER CHEAP] #5302"
 *    => { groupName: "Instagram Followers", variantName: "30 Days Guarantee" }
 */

export interface CleanedNameResult {
  groupName: string;
  variantName: string;
}

export function cleanServiceName(rawName: string): CleanedNameResult {
  if (!rawName) {
    return { groupName: "Service", variantName: "Standard" };
  }

  let name = rawName.trim();

  // 1. Remove leading/trailing IDs
  name = name.replace(/^(\d+|\bID[:\s]*\d+)\s*[-:.|]\s*/i, "");
  name = name.replace(/^#\d+\s*/, "");
  name = name.replace(/#\d+$/g, "");
  name = name.replace(/\[\s*id[:\s]*\d+\s*\]/gi, "");
  name = name.replace(/id[:\s]*\d+$/gi, "");

  // 2. Normalize mathematical bold fonts
  const mathCharsArray = [..."𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵"];
  const asciiCharsArray = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"];
  name = name.replace(
    /[\u{1D5D4}-\u{1D607}\u{1D7EC}-\u{1D7F5}]/gu,
    (char) => {
      const idx = mathCharsArray.indexOf(char);
      return idx !== -1 ? asciiCharsArray[idx] : char;
    }
  );

  // 3. Strip Emojis
  name = name.replace(/[\p{Emoji_Presentation}]/gu, "");

  // 4. Extract Base Name vs Variant String based on first 2-3 words
  let words = name.trim().split(/\s+/);
  let groupName = words.slice(0, 2).join(" ");
  let variantString = words.slice(2).join(" ");

  const coreKeywords = ["views", "likes", "comments", "followers", "subscribers", "shares", "retweets", "members"];
  if (words.length > 2 && coreKeywords.includes(words[2].toLowerCase())) {
    groupName = words.slice(0, 3).join(" ");
    variantString = words.slice(3).join(" ");
  }

  // 5. Clean Variant String
  let v = variantString;
  
  // Extract specific guarantees from brackets if present before stripping brackets
  let overrideVariant = "";
  const refillMatch = rawName.match(/\[.*?(30|60|90|365|Lifetime|Auto|Refill).*?\]/i) || rawName.match(/\((.*?(30|60|90|365|Lifetime|Refill).*?)\)/i);
  if (refillMatch && words.length <= 2) {
      // If the string was very short, we might not have a variant string.
      const rawRefill = refillMatch[1] || refillMatch[0];
      if (/lifetime/i.test(rawRefill)) overrideVariant = "Lifetime Guarantee";
      else if (/365/i.test(rawRefill)) overrideVariant = "365 Days Guarantee";
      else if (/90/i.test(rawRefill)) overrideVariant = "90 Days Guarantee";
      else if (/60/i.test(rawRefill)) overrideVariant = "60 Days Guarantee";
      else if (/30/i.test(rawRefill)) overrideVariant = "30 Days Guarantee";
      else if (/refill/i.test(rawRefill)) overrideVariant = "Auto Refill";
  }

  // Strip brackets from variant
  v = v.replace(/\[[^\]]*\]/g, "");
  v = v.replace(/\([^\)]*(speed|d|day|refill|instant|cheap|fast|min|hrs|max|r30|r60|r90|hq|real|non-drop|working)[^\)]*\)/gi, "");

  // Strip spammy speed/max text
  v = v.replace(/\b(MAX|SPEED|STARTS)\s*[\d.KkMm]+[\s-]*\b/gi, "");
  v = v.replace(/\b[\d.KkMm+]+(\/Day| Day)\b/gi, "");
  v = v.replace(/\b\d+\s*(?:K|M|B)\b(?!\s*(?:Likes|Followers|Views|Comments|Shares))/gi, "");
  v = v.replace(/\b(INSTANT|WORKING|PREMIUM|CHEAP)\b/gi, "");

  // Clean punctuation
  v = v.replace(/[-|:🔢♻️⚡🚀💧👤]+/g, " ");
  v = v.replace(/\s+/g, " ").trim();
  v = v.replace(/^\W+/, "").replace(/\W+$/, "");

  // Clean Capitalization
  v = v.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
  groupName = groupName.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());

  let finalVariant = overrideVariant || v;
  if (!finalVariant || finalVariant.length < 2) {
    if (/real/i.test(rawName)) finalVariant = "Real Accounts";
    else if (/hq|high quality/i.test(rawName)) finalVariant = "High Quality";
    else finalVariant = "Standard";
  }

  return { 
    groupName: groupName, 
    variantName: finalVariant 
  };
}
