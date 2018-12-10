#!/usr/bin/env python
# -*- coding: utf-8 -*-
# @Time    : 2018/11/19 10:53 AM
# @Author  : zer0i3
# @File    : __init__.py

from flask import render_template, abort, redirect, url_for, request
from CTFd.utils.config.pages import get_page
from CTFd.utils.user import authed
from CTFd.utils import get_config
from CTFd.utils import markdown
from CTFd.models import Pages, db


def load(app):
    def custom_static_html(route):
        if route == 'index' and get_config('ctf_theme') == 'aeolus':
            return render_template('index.html')
        page = get_page(route)
        if page is None:
            abort(404)
        else:
            if page.auth_required and authed() is False:
                return redirect(url_for('auth.login', next=request.path))

            return render_template('page.html', content=markdown(page.content))

    def add_home_index():
        home_page = Pages.query.filter(Pages.route == "home", Pages.draft != True).first()
        if not home_page:
            home_html = """<div class="row">
    <div class="col-md-6 offset-md-3">
        <h3 class="text-center">
            <p>CTF platform for <a href="https://a30lu5.github.io/blogs/">AD-LAB</a></p>
            <p>Follow us on github:</p>
            <a href="https://github.com/A30lu5"><i class="fab fa-github fa-2x" aria-hidden="true"></i></a>
        </h3>
        <br>
        <h4 class="text-center">
            <a href="login">Click here</a> to login
        </h4>
    </div>
</div>"""
            page = Pages(title=None, route='home', content=home_html, draft=False)
            db.session.add(page)
            db.session.commit()

    add_home_index()
    # The format used by the view_functions dictionary is blueprint.view_function_name
    app.view_functions['views.static_html'] = custom_static_html