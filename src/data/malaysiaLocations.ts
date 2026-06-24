export const malaysiaLocations: Record<string, string[]> = {
  Johor: ["Johor Bahru", "Batu Pahat", "Muar", "Kluang", "Skudai", "Iskandar Puteri"],
  Kedah: ["Alor Setar", "Sungai Petani", "Kulim", "Langkawi", "Jitra"],
  Kelantan: ["Kota Bharu", "Tanah Merah", "Tumpat", "Pasir Mas"],
  "Kuala Lumpur": ["Bukit Bintang", "Cheras", "Setapak", "Wangsa Maju", "Mont Kiara", "Bangsar"],
  Labuan: ["Victoria", "Rancha-Rancha", "Kiamsam"],
  Melaka: ["Melaka City", "Ayer Keroh", "Batu Berendam", "Alor Gajah"],
  "Negeri Sembilan": ["Seremban", "Nilai", "Port Dickson", "Senawang"],
  Pahang: ["Kuantan", "Bentong", "Temerloh", "Genting Highlands", "Cameron Highlands"],
  Penang: ["George Town", "Bayan Lepas", "Butterworth", "Bukit Mertajam", "Tanjung Tokong"],
  Perak: ["Ipoh", "Kampar", "Taiping", "Batu Gajah", "Sitiawan"],
  Perlis: ["Kangar", "Arau", "Kuala Perlis"],
  Putrajaya: ["Precinct 1", "Precinct 8", "Precinct 9", "Precinct 15"],
  Sabah: ["Kota Kinabalu", "Sandakan", "Tawau", "Lahad Datu"],
  Sarawak: ["Kuching", "Miri", "Sibu", "Bintulu"],
  Selangor: ["Petaling Jaya", "Shah Alam", "Subang Jaya", "Puchong", "Cyberjaya", "Kajang", "Klang"],
  Terengganu: ["Kuala Terengganu", "Dungun", "Kemaman", "Marang"],
};

export const malaysiaStates = Object.keys(malaysiaLocations);

export function formatLocation(area: string, state: string) {
  return [area, state].filter(Boolean).join(", ");
}

export function parseLocation(location: string) {
  const normalizedLocation = location.trim().toLowerCase();

  for (const [state, areas] of Object.entries(malaysiaLocations)) {
    const normalizedState = state.toLowerCase();
    const matchedArea = areas.find((area) => normalizedLocation.includes(area.toLowerCase()));

    if (matchedArea && normalizedLocation.includes(normalizedState)) {
      return { area: matchedArea, state };
    }

    if (matchedArea) {
      return { area: matchedArea, state };
    }

    if (normalizedLocation.includes(normalizedState)) {
      return { area: "", state };
    }
  }

  return { area: "", state: "" };
}
