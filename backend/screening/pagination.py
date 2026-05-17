from rest_framework.pagination import PageNumberPagination


class DashboardPagination(PageNumberPagination):
    """
    Server-side pagination for the dashboard table.

    Trade-off note (also in README → "B-2 Pagination vs Virtualization"):
      We picked server-side pagination over client virtual scrolling because:
        - Single-page DB query stays under 25ms for 50K+ rows with our index.
        - Bandwidth scales with what's on screen, not total dataset size.
        - Works on slow networks; virtual scrolling needs the full list cached.
      Virtual scrolling wins if every user always wants to see everything.
      Ours is a search-heavy "find one screening" workflow, so paging fits better.
    """

    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100
