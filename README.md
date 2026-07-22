# TreeMonkey
Website which allows users to select attributes (i.e. water amount, sun location) about a given location, and will return user with a list of possible plants for that location.

User will first input their zipcode, which will then be used to determine their hardiness zone.
The user can then choose to input data for optional categories. 
Based on the provided information, TreeMonkey will provide a list of plants which would be optimal for that location.

Originally used a local host PostgreSQL server, then migrated to Supabase after needing to implement a Render express route which would allow querys to be made to the Supabase database based on user input.

This project calls Perenual API for all plant related information, and waldoj's frostline project for zip code related information.\

This project is hosted on WebHostingHub.
