---
# Feel free to add content and custom Front Matter to this file.
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults

layout: default
---

Releases
========

{%- for dl in site.static_files -%}
{%- if dl.path contains '/downloads/refs/tags/' %}
- [{{ dl.path | remove_first: "/downloads/refs/tags/" }}]({{ dl.path | relative_url }})
{% endif %}
{% endfor %}

Branches
========

{%- for dl in site.static_files -%}
{%- if dl.path contains '/downloads/refs/heads/' %}
- [{{ dl.path | remove_first: "/downloads/refs/heads/" }}]({{ dl.path | relative_url }})
{% endif %}
{% endfor %}
