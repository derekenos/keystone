
# User Permissions Matrix

## When ALLOW_INACTIVE_USER_AS_VIEWER = True

When `config.settings.ALLOW_INACTIVE_USER_AS_VIEWER = True`, a user having `is_active = False` will be
allowed to continue to log in, but with their permissions constrained to that of a `Viewer`-type user.

### Collections

| User Role | User Active | Account Active | View | Edit User Settings | Create Custom | Edit Custom Name |
|-----------|-------------|----------------|------|--------------------|---------------|------------------|
| Admin     | Yes         | Yes            | Yes  | Yes                | Yes           | Yes (if owner)   |
| User      | Yes         | Yes            | Yes  | Yes                | Yes           | Yes (if owner)   |
| Viewer    | Yes         | Yes            | Yes  | Yes                | No            | No               |
| Admin     | Yes         | No             | Yes  | Yes                | No            | No               |
| User      | Yes         | No             | Yes  | Yes                | No            | No               |
| Viewer    | Yes         | No             | Yes  | Yes                | No            | No               |
| Admin     | No          | Yes            | Yes  | Yes                | No            | No               |
| User      | No          | Yes            | Yes  | Yes                | No            | No               |
| Viewer    | No          | Yes            | Yes  | Yes                | No            | No               |
| Admin     | No          | No             | Yes  | Yes                | No            | No               |
| User      | No          | No             | Yes  | Yes                | No            | No               |
| Viewer    | No          | No             | Yes  | Yes                | No            | No               |

### Datasets

| User Role | User Active | Account Active | View | Edit User Settings | Generate | Download | Colab | Modify Teams   | Publish        |
|-----------|-------------|----------------|------|--------------------|----------|----------|-------|----------------|----------------|
| Admin     | Yes         | Yes            | Yes  | Yes                | Yes      | Yes      | Yes   | Yes (if owner) | Yes (if owner) |
| User      | Yes         | Yes            | Yes  | Yes                | Yes      | Yes      | Yes   | Yes (if owner) | Yes (if owner) |
| Viewer    | Yes         | Yes            | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Admin     | Yes         | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| User      | Yes         | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Viewer    | Yes         | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Admin     | No          | Yes            | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| User      | No          | Yes            | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Viewer    | No          | Yes            | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Admin     | No          | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| User      | No          | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Viewer    | No          | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |

### Accounts

| User Role | User Active | Account Active | View Users | Add User | Edit User | View Teams      | Add Team | Edit Team |
|-----------|-------------|----------------|------------|----------|-----------|-----------------|----------|-----------|
| Admin     | Yes         | Yes            | Yes        | Yes      | Yes       | Yes             | Yes      | Yes       |
| User      | Yes         | Yes            | No         | No       | No        | Yes (if member) | No       | No        |
| Viewer    | Yes         | Yes            | No         | No       | No        | No              | No       | No        |
| Admin     | Yes         | No             | Yes        | No       | No        | Yes             | No       | No        |
| User      | Yes         | No             | No         | No       | No        | No              | No       | No        |
| Viewer    | Yes         | No             | No         | No       | No        | No              | No       | No        |
| Admin     | No          | Yes            | No         | No       | No        | No              | No       | No        |
| User      | No          | Yes            | No         | No       | No        | No              | No       | No        |
| Viewer    | No          | Yes            | No         | No       | No        | No              | No       | No        |
| Admin     | No          | No             | No         | No       | No        | No              | No       | No        |
| User      | No          | No             | No         | No       | No        | No              | No       | No        |
| Viewer    | No          | No             | No         | No       | No        | No              | No       | No        |


## When ALLOW_INACTIVE_USER_AS_VIEWER = False

When `config.settings.ALLOW_INACTIVE_USER_AS_VIEWER = False`, a user having `is_active = False` will not be allowed to log in.

These permissions differ from that of the above for `ALLOW_INACTIVE_USER_AS_VIEWER = True` in that access is denied accress the
board for any row with `User.is_active = False` due to the fact that this user would not even be allowed to log in.

### Collections

| User Role | User Active | Account Active | View | Edit User Settings | Create Custom | Edit Custom Name |
|-----------|-------------|----------------|------|--------------------|---------------|------------------|
| Admin     | Yes         | Yes            | Yes  | Yes                | Yes           | Yes (if owner)   |
| User      | Yes         | Yes            | Yes  | Yes                | Yes           | Yes (if owner)   |
| Viewer    | Yes         | Yes            | Yes  | Yes                | No            | No               |
| Admin     | Yes         | No             | Yes  | Yes                | No            | No               |
| User      | Yes         | No             | Yes  | Yes                | No            | No               |
| Viewer    | Yes         | No             | Yes  | Yes                | No            | No               |
| Admin     | No          | Yes            | No   | No                 | No            | No               |
| User      | No          | Yes            | No   | No                 | No            | No               |
| Viewer    | No          | Yes            | No   | No                 | No            | No               |
| Admin     | No          | No             | No   | No                 | No            | No               |
| User      | No          | No             | No   | No                 | No            | No               |
| Viewer    | No          | No             | No   | No                 | No            | No               |

### Datasets

| User Role | User Active | Account Active | View | Edit User Settings | Generate | Download | Colab | Modify Teams   | Publish        |
|-----------|-------------|----------------|------|--------------------|----------|----------|-------|----------------|----------------|
| Admin     | Yes         | Yes            | Yes  | Yes                | Yes      | Yes      | Yes   | Yes (if owner) | Yes (if owner) |
| User      | Yes         | Yes            | Yes  | Yes                | Yes      | Yes      | Yes   | Yes (if owner) | Yes (if owner) |
| Viewer    | Yes         | Yes            | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Admin     | Yes         | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| User      | Yes         | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Viewer    | Yes         | No             | Yes  | Yes                | No       | Yes      | Yes   | No             | No             |
| Admin     | No          | Yes            | No   | No                 | No       | No       | No    | No             | No             |
| User      | No          | Yes            | No   | No                 | No       | No       | No    | No             | No             |
| Viewer    | No          | Yes            | No   | No                 | No       | No       | No    | No             | No             |
| Admin     | No          | No             | No   | No                 | No       | No       | No    | No             | No             |
| User      | No          | No             | No   | No                 | No       | No       | No    | No             | No             |
| Viewer    | No          | No             | No   | No                 | No       | No       | No    | No             | No             |

### Accounts

| User Role | User Active | Account Active | View Users | Add User | Edit User | View Teams      | Add Team | Edit Team |
|-----------|-------------|----------------|------------|----------|-----------|-----------------|----------|-----------|
| Admin     | Yes         | Yes            | Yes        | Yes      | Yes       | Yes             | Yes      | Yes       |
| User      | Yes         | Yes            | No         | No       | No        | Yes (if member) | No       | No        |
| Viewer    | Yes         | Yes            | No         | No       | No        | No              | No       | No        |
| Admin     | Yes         | No             | Yes        | No       | No        | Yes             | No       | No        |
| User      | Yes         | No             | No         | No       | No        | No              | No       | No        |
| Viewer    | Yes         | No             | No         | No       | No        | No              | No       | No        |
| Admin     | No          | Yes            | No         | No       | No        | No              | No       | No        |
| User      | No          | Yes            | No         | No       | No        | No              | No       | No        |
| Viewer    | No          | Yes            | No         | No       | No        | No              | No       | No        |
| Admin     | No          | No             | No         | No       | No        | No              | No       | No        |
| User      | No          | No             | No         | No       | No        | No              | No       | No        |
| Viewer    | No          | No             | No         | No       | No        | No              | No       | No        |
