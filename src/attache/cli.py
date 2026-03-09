"""Attaché CLI — bootstrap and manage OpenClaw agent hosts."""

import argparse
import os
import subprocess
import sys
import tempfile
from pathlib import Path


def get_platform_root() -> Path:
    """Find the attache-platform root directory."""
    # When installed as a package, ansible/ lives alongside src/
    candidate = Path(__file__).resolve().parent.parent.parent
    if (candidate / "ansible" / "playbooks").exists():
        return candidate
    # Fallback: look for it in common locations
    for path in [
        Path.cwd(),
        Path.home() / ".attache" / "platform",
    ]:
        if (path / "ansible" / "playbooks").exists():
            return path
    print("Error: Could not find attache-platform ansible/ directory.", file=sys.stderr)
    sys.exit(1)


def install_galaxy_deps(platform_root: Path) -> None:
    """Install Ansible Galaxy collections from requirements.yml."""
    req_file = platform_root / "ansible" / "requirements.yml"
    if req_file.exists():
        subprocess.run(
            ["ansible-galaxy", "collection", "install", "-r", str(req_file)],
            check=True,
        )


def generate_inventory(user: str, host: str, agent_name: str | None = None) -> str:
    """Generate a temporary inventory file and return its path."""
    name = agent_name or user.capitalize()
    content = f"""all:
  hosts:
    agent:
      ansible_host: {host}
      ansible_user: {user}
      agent_name: {name}
"""
    fd, path = tempfile.mkstemp(suffix=".yml", prefix="attache-inventory-")
    os.write(fd, content.encode())
    os.close(fd)
    return path


def cmd_bootstrap(args: argparse.Namespace) -> None:
    """Run the bootstrap playbook against a target host."""
    platform_root = get_platform_root()

    # Parse target: user@host
    if "@" not in args.target:
        print("Error: Target must be in the format user@host", file=sys.stderr)
        sys.exit(1)
    user, host = args.target.split("@", 1)

    # Install galaxy deps
    install_galaxy_deps(platform_root)

    # Generate inventory
    inv_path = generate_inventory(user, host, args.name)

    try:
        # Build ansible-playbook command
        cmd = [
            "ansible-playbook",
            "-i", inv_path,
            str(platform_root / "ansible" / "playbooks" / "bootstrap.yml"),
        ]

        if args.config:
            cmd.extend(["-e", f"config_repo={args.config}"])
        if args.private:
            cmd.extend(["-e", "config_repo_private=true"])
        if args.check:
            cmd.append("--check")
        if args.tags:
            cmd.extend(["--tags", args.tags])
        if args.verbose:
            cmd.append("-vv")

        subprocess.run(cmd, check=True)
    finally:
        os.unlink(inv_path)


def cmd_status(args: argparse.Namespace) -> None:
    """Check the status of an Attaché agent host."""
    print("Status command not yet implemented.")
    sys.exit(0)


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="attache",
        description="Attaché — turnkey AI agent platform powered by OpenClaw",
    )
    parser.add_argument("--version", action="version", version=f"%(prog)s {__import__('attache').__version__}")

    subparsers = parser.add_subparsers(dest="command", required=True)

    # bootstrap
    bp = subparsers.add_parser("bootstrap", help="Provision a new agent host")
    bp.add_argument("target", help="Target in user@host format (e.g., evie@mac-mini.local)")
    bp.add_argument("--config", "-c", help="Config repo (e.g., divideby0/evie)")
    bp.add_argument("--private", action="store_true", help="Config repo is private")
    bp.add_argument("--name", "-n", help="Agent display name (defaults to username)")
    bp.add_argument("--check", action="store_true", help="Dry run (Ansible check mode)")
    bp.add_argument("--tags", help="Only run specific Ansible tags")
    bp.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    bp.set_defaults(func=cmd_bootstrap)

    # status
    sp = subparsers.add_parser("status", help="Check agent host status")
    sp.add_argument("target", help="Target in user@host format")
    sp.set_defaults(func=cmd_status)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
