# Created by `usd-brep-brewer new <id>`; replace build(), then run `usd-brep-brewer run <id>`.
# Z-up, cm. Many ops consume or mutate their arguments: brep.copy() first if you reuse a shape.
import usd_brep as sm


def build() -> sm.Brep:
    body = sm.create_box((0, 0, 0), 10, 10, 10)  # origin = min corner; sizes along X, Y, Z
    hole = sm.create_cylinder((5, 5, -1), 3, 12)  # base center, radius, height along Z
    return sm.boolean_difference(body, hole)


brep = build()
print(brep.info())  # goes to gen.log; use report.json bounds for exact sizes
sm.usd.export_brep(brep, "/work/out.usda")  # required output
