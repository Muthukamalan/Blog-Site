from secrets import token_urlsafe
from slugify import slugify


def make_slug_from_title(title:str)->str:
    slug = slugify(text=title,max_length=32,lowercase=True)
    unique_code=token_urlsafe(6)
    return f"{slug}-{unique_code.lower()}"


def make_slug_from_title_and_code(title:str,code:str)->str:
    slug = slugify(text=title,max_length=32,lowercase=True)
    return f"{slug}-{code}"

def get_slug_unique_part(slug:str)->str:
    return slug.split("-")[-1]