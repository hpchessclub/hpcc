export const JUNIOR_CONFIG_SLUG = "hpcc-internal-junior-settings";
export const juniorDefaults = {
 title: "Junior Chess",
 introduction: "HPCC has one of the largest junior memberships of any chess club in New Zealand. Junior Hour runs every Tuesday in term time, and the path into senior club chess is open to every junior.",
 contactEmail: "hpchess.winnie@gmail.com",
 when: "Tuesdays during term time, 6:00pm–7:00pm. Arrive at 5:50pm to help set up.",
 where: "Downstairs at Howick Bowling Club, 33 Selwyn Road, Cockle Bay, Auckland.",
 holidays: "Junior Club does not run during school holidays.",
 session: "Club volunteers lead Junior Hour, with parents helping and supervising. Sessions mainly suit beginners and begin with about 15 minutes of interactive lessons, followed by games and chess activities. Club pairings and recorded results contribute to the Junior Hour Ladder.",
 ladderDescription: "Use the club’s Chess Club Manager to view standings, find your pairing and sign in for Tuesday Junior Hour.",
 ladderUrl: "https://d3rh1x6y29qc6a.cloudfront.net",
 pairingUrl: "https://d3rh1x6y29qc6a.cloudfront.net/session/me",
 signInUrl: "https://d3rh1x6y29qc6a.cloudfront.net/kiosk",
 signInNote: "Tuesday sign-in opens at 6:00pm.",
 termsTitle: "2026 term dates",
 terms: "| Term | Dates |\n| --- | --- |\n| Term 1 | 26 January – 2 April 2026 |\n| Term 2 | 20 April – 3 July 2026 |\n| Term 3 | 20 July – 25 September 2026 |\n| Term 4 | 12 October – 20 December 2026 |",
 challenges: "These sessions help juniors move into senior club play. New and prospective members are welcome, with parents encouraged to support their children.\n\n**2026 scheduled dates**\n\n- Tuesday 10 February — junior registration and Challenge Night 1\n- Tuesday 21 April — Challenge Night 2\n- Tuesday 14 July — Challenge Night 3\n\nTime control: 60 minutes + 5 seconds. These dates are past; future challenge dates will be announced.",
 championship: "Recent champions include Ayaan Bhatia (2025), Dian Guan (2024), Mason Khong (2023) and Franklyn Zhang (2022).\n\n[Honours board](http://hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com/honours/#junior-championship)",
 seniorChess: "Juniors who know how the pieces move and can record their games are welcome in the rated 7:15pm club tournaments alongside adults. Senior tournaments continue during school holidays.\n\n[How club nights work](http://hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com/club-nights/)",
 interschools: "HPCC has organised the NZCF East Auckland Interschool Chess Championships since 2023, for primary, intermediate and secondary school teams.\n\n[2026 interschools](http://hpchessclub.org.s3-website-ap-southeast-2.amazonaws.com/events/east-auckland-interschools-2026/)",
 alumni: "Former HPCC juniors include WIM Jasmine Zhang, FM Luke Li and FM Daniel Gong, who have represented New Zealand at Olympiad level.",
 parents: "Please email before your child’s first visit and mention that they are joining Junior Club. Parents help provide supervision during Junior Hour and are welcome to stay. Each child needs their own membership form."
};
export type JuniorConfig = typeof juniorDefaults;
export function validateJuniorConfig(input: unknown): JuniorConfig {
 if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid Junior Chess settings.");
 const result = {} as JuniorConfig;
 for (const key of Object.keys(juniorDefaults) as (keyof JuniorConfig)[]) {
  const value = (input as Record<string, unknown>)[key];
  if (typeof value !== "string" || !value.trim() || value.length > 20000) throw new Error(`Enter ${key} (maximum 20,000 characters).`);
  result[key] = value.trim();
 }
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contactEmail)) throw new Error("Enter a valid contact email.");
 for (const key of ["ladderUrl", "pairingUrl", "signInUrl"] as const) {
  let url: URL; try { url = new URL(result[key]); } catch { throw new Error("Enter valid ladder links."); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Ladder links must use HTTP or HTTPS without credentials.");
 }
 return result;
}
