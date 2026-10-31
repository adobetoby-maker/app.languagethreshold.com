// Navigation does not need to fetch article bodies or initialize a query client.
// The blog page owns article loading and its empty state.
export function BlogNavLink() {
  return (
    <a href="/blog" className="block px-3 py-2 text-sm text-foreground hover:text-gold">
      Blog
    </a>
  );
}
