LOCALES = ["en", "hr", "de", "bs", "es", "pt", "sr", "fr", "it", "nl", "tr", "ar"]

def make_id(n):
    return f"aaaaaaaa-{n:04d}-4000-8000-000000000{n:03d}"

def L(en, hr, de, bs, es, pt, sr, fr, it, nl, tr, ar):
    return {"en": en, "hr": hr, "de": de, "bs": bs, "es": es, "pt": pt, "sr": sr, "fr": fr, "it": it, "nl": nl, "tr": tr, "ar": ar}

def O(en, hr, de, bs, es, pt, sr, fr, it, nl, tr, ar):
    return {"en": en, "hr": hr, "de": de, "bs": bs, "es": es, "pt": pt, "sr": sr, "fr": fr, "it": it, "nl": nl, "tr": tr, "ar": ar}

def q(text, opts, correct, category):
    return {
        "id": None,
        "category": category,
        "correct_option_index": correct,
        "question_text": text,
        "options": opts,
    }
