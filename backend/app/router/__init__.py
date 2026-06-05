from app.router.posts import (
    # create_post,
    # delete_post,
    # get_post,
    # get_posts,
    # update_post_full,
    # update_post_partial,
    router,
)
from app.router.users import (
    # change_password,
    # create_access_token,
    # create_user,
    # delete_profile_image,
    # delete_user,
    # delete_user_picture,
    # forgot_password,
    router,
)
from app.router.users import router as user_router
from app.router.posts import router as post_router

__all__ = [
    "user_router",
    "post_router",
]
