
const PLEBSTR_API = 'https://search.pleb.str.cr';

type PlebstrUser = {
  name: string;
  picture: string;
  pubkey: string;
};

export const searchPlebstr = async (query: string): Promise<PlebstrUser[]> => {
  if (query.length < 2) {
    return [];
  }

  try {
    const res = await fetch(`${PLEBSTR_API}/users?query=${query}&limit=10`);
    const data = await res.json();
    return data.map((user: any) => ({
      name: user.name,
      picture: user.picture,
      pubkey: user.pubkey,
    }));
  } catch (e) {
    console.error('Error searching Plebstr', e);
    return [];
  }
};
