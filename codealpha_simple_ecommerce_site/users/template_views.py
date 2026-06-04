from django.shortcuts import render


def login_view(request):
    """Render the login page. Auth handled by JS + API."""
    return render(request, 'users/login.html')


def register_view(request):
    """Render the registration page. Registration handled by JS + API."""
    return render(request, 'users/register.html')


def logout_view(request):
    """Logout is handled client-side (token removal). Redirect to home."""
    return render(request, 'users/login.html')
