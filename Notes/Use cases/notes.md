Project: Glenveagh Properties Coding Challenge

Problem Statement: Build a small marketing platform for a fictional housing development. It has three connected parts: a public marketing website, a custom content management system (CMS) that powers it, and a simple email campaign tool for announcing updates to subscribers.


Use Cases:

User POV:
1. To view properties
2. To submit your interest - store data consent - validation
3. Calculate your mortgage
4. Comparison of properties
5. Data analytics based upon property value growth
6. Save properties and view the list of saved properties
7. RAG chatbot
    - Handles complex queries and adjusts the filters accordingly for select queries
    - Answers doubts regarding any properties based upon the property details

Admin POV:
1. Admin based login
2. Admin Dashboard
    - View property listing (Pop up)
        - Property cards (property details,)
        - Filters:
            - View current listed properties
            - View offline properties
            - Location
            - Price range
            - Latest (on shelf date)
            - Beds and baths
            - Current stage
    - Add Properties
        - Manual entry or excel entry
        - Checker as a precaution
        - Create ai video of home tour using MCP server using Dashscope
        - Admin check of the home tour and retry option with prompt modifications
        - Save as draft
        - Publish
    - Property Management
        - Property cards (property details, update, Status, publish)
        - Delete property option
        - Add / delete photos
        - Update details
        - Update home tour video
        - Save as draft
        - Publish
    - Email Campaign 
        - View / Add Subscribers 
            - Count and list of current subscribers (export to excel)
            - Count and list of current unsubscribers (export to excel)
            - Add subscribers - Manual entry and excel (Name, Email, Phone (optional))
        - Campaign log
            - Filter by date range
            - List of email campaign posts
                - Reachout (click count, interest count, save count)
                - Date of issue
                - Properties listed (Number and names)
                - Send/Fail Status for all users 
        - Campaign statistics (per day)
            - Unsubscribe per day
            - Email sent per day
            - Click/Email rate (source email)
            - Interest/Email rate (source email)
            - Date range for getting the stats
        - Create Campaign
            - Select and post campaign
                - Property (details)
                - Filters and sorts
                    - Click count
                    - Interest count
                    - Not campaigned
                    - Location
                    - Price range
                    - Latest (on shelf date)
                    - Beds and baths
            - Template creation
                - Properties
                - Code editor
    - Interests
        - Filteration panel (Properties, date of interest, location, agent)
        - Email content
        - Proprty card with number of interests (counter updated based interest registered (add) and email sent (delete))
            - List of interests
            - Email
