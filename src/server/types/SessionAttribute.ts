export type SessionAttribute = {
  id: string;
  title: string;
};

export function newSessionAttribute(
  id: string,
  title: string
): SessionAttribute {
  return {
    id,
    title,
  };
}
