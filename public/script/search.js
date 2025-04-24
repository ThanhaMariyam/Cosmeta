document
  .getElementById("searchInput")
  .addEventListener("input", async function () {
    const query = this.value.trim();
    const searchResults = document.getElementById("searchResults");

    if (query.length < 1) {
      searchResults.style.display = "none";
      return;
    }

    try {
      const response = await fetch(`/search-products?q=${query}`);
      const results = await response.json();

      if (results.length === 0) {
        searchResults.innerHTML = "<div>No results found</div>";
      } else {
        searchResults.innerHTML = results
          .map(
            (item) =>
              `<div onclick="window.location.href='${item.link}'">${item.name}</div>`
          )
          .join("");
      }

      searchResults.style.display = "block";
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  });

document.addEventListener("click", function (event) {
  const searchResults = document.getElementById("searchResults");
  if (!document.querySelector(".search").contains(event.target)) {
    searchResults.style.display = "none";
  }
});
