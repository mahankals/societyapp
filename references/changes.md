# Enhancement
## Global
- SESSION_LIFETIME in .env not work.
- resident & tenant must see the details which they required not other. like tenant not required to view 'bills & dues' & receipts. tenants & resident can required members contact only for society member they linked, not other society members.

## notification
- after visiting notification screen still it show notification badgage. there is no way to mark single notification as read
- bulk payment notification shows but need to add button to open 'Pending Payment Confirmations'
- supriyamahankal received the 'Bulk Payment Confirmation Required' but she is not a part of any society & commitee. Notification must visible to applicable user type & role if any.

## Admin setting
- setting must contains all tabs available in setup page except Super 'Administrator' & 'Review & deploy' refer '@references/screencapture-setup.png'
- Show vertical tabs instead of horizontal

# UI/UX changes
- Default form submit button must be inactive & enable if form content changed. for connectivity add [test] button with verifying success test while saving. test fail will stop form submission. refer setting page with Read-only access. (update UI ADR)













-------------------------------------------------

# Enhancement
## Setup page
- Setup page must load after enter valid SETUP_KEY matching from .env which create while loading setup page only if not present.
- Mobile Number must be required

## password reset
- send reset link not work. no error, no email

## /society/contribute
- primary Founding Committee Members (logged user) must be non editable.
- rest Committee Members should added with searching email/phone. enter email/phone in search input, pressing search button search the existing user from platform & show the name  to add. into member list.
- remove flat number
- UI must be like '/home/atul/Downloads/screencapture-society-contribute.png'. filled Flats auto created & link to mentioned users while acepted.
- contribution must be available to user with status.

## Notification
- notification url must be '/user/notification' not '/resident/notifications'
- pending society proposal approval not show in adming notification. it show in Societies Management only.
- flat link request notification not comes for society comitee member.
- navbar notification must show only unread notifications.
- notification must contain [read|unread] [view] buttons. [view]  button can redirect to provided url or show message into modal. clicking [view] treated as read.

## /admin/societies
- remove UPI Details.
- instead of modal show pending approval as page with '/admin/societies/pending'

## /admin/settings
- show 500

## /comitee/requests
- rejection must require remark/resons
- request must show at top in '/comitee/members' if exist.

## /comitee/members
- while unlink flat it show '() => this.submit()' in confirmation modal.
- instead of [Edit Role] make it [Edit] to change Flat, Role, 

## /comitee/bills
- while generated single bill, Particulars auto added with maintanance for non maintanance bill. it must pick from title.
- 'Society UPI Payment Settings' must be in 2 part, UPI VPA / ID & Payee Name + preview with prefilled amount to check.
- while approving payment confirmation it show '() => this.submit()' in modal.
- All Bills|Pending|Paid|rejected filter not worked. it show All(9)|pending(9)|Paid(0)|Rejected(0). required All(9)|Paid(0)|Unpaid(7)|confirmation(1)|Rejected(1).
- instead of appending status parameter to filter use hash id to switch tab & focus to table instead of moving to top

## resident dashboard
- remove Unit Pending card
- My Associated Flats & Societies contains only linked flats
- My Associated Flats & Societies must show [Rejected] button near [Link Flat] which show rejected request only if rejection presents
- buttons in flat card enable only if link accepted
- mobile number of user is required. if it blank redirect to profile with message.

## /resident/bills
- [Pay with UPI] button must available if society registered with UPI

## resident/link-flat
- Select Available Unit / Flat must show unavailable flat currently it show B-203 for swagat village which is linked.

## Profile menu
- 'Help & support' option must show 'contact us' form not explore contact details.

## Profile
- Add connected account tab which currently show google connection with [link/unlink] toggle.
- add label to country code & make country code & phone number, whatsapp with same height. 

## Landing page
- instead of showing contact number at button in `Designed & Developed by Atul Mahankal (9967 181 952)` link to contact us page.

## /resident > Manage Occupancy
- for Rented, Full Name & phone number must be readonly.
- on form save it close modal & show error "Invalid security token."

# UI/UX changes
- dark/light mode not properly visible. refer '/home/atul/Pictures/Screenshots/Screenshot From 2026-10-09 20-47-36.png'
- every table contain search & required filters (Update into UI ADR)
- move topbar menus into sidebar. & show Society name at topbar for resident/tenent/comittee as a dropdown so multi linked user can switch the report for different society.
- add breadcrump bellow topbar
- Modal form must show error while saving inside modal only.
- resident 'Manage Flat Occupancy' modal show horizontal scrollbar for rented. refer'/home/atul/Pictures/Screenshots/Screenshot From 2026-10-09 23-11-58.png'


------------------------------------------------------

